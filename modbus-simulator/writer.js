
const ModbusRTU = require("modbus-serial");

const client = new ModbusRTU();

const HOST = "10.0.2.2";
const PORT = 5021;

const MachineStatus = {
  STOPPED: 0,
  RUNNING: 1,
  FAULT: 2
};

const state = {
  status: MachineStatus.RUNNING,
  productionCount: 1000,
  motorTemperature: 25.0,
  motorCurrent: 0,
  scrapCount: 10,
  heartbeat: 0
};

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function simulateRunning() {
  state.productionCount +=
    Math.floor(Math.random() * 3) + 1;

  if (state.motorTemperature < 65) {
    state.motorTemperature += 0.5;
  } else {
    state.motorTemperature +=
      (Math.random() - 0.5) * 0.4;
  }

  state.motorTemperature = clamp(
    state.motorTemperature, 20, 68
  );

  state.motorCurrent = 10 + Math.random() * 4;

  if (Math.random() < 0.05) {
    state.scrapCount++;
  }
}

function simulateStopped() {
  state.motorTemperature = Math.max(
    25, state.motorTemperature - 0.5
  );

  state.motorCurrent = Math.max(
    0, state.motorCurrent - 1
  );
}

function simulateFault() {
  state.motorTemperature = Math.min(
    100, state.motorTemperature + 1
  );

  state.motorCurrent = 18 + Math.random() * 5;
}

function updateMachine() {
  switch (state.status) {
    case MachineStatus.RUNNING:
      simulateRunning();
      break;
    case MachineStatus.STOPPED:
      simulateStopped();
      break;
    case MachineStatus.FAULT:
      simulateFault();
      break;
  }
}

function uint32ToWords(value) {
  const buffer = Buffer.alloc(4);
  buffer.writeUInt32BE(value, 0);

  return [
    buffer.readUInt16BE(0),
    buffer.readUInt16BE(2)
  ];
}

function float32ToCDAB(value) {
  const buffer = Buffer.alloc(4);
  buffer.writeFloatBE(value, 0);

  return [
    buffer.readUInt16BE(2),
    buffer.readUInt16BE(0)
  ];
}

async function writeTelemetry() {
  const production = uint32ToWords(
    state.productionCount
  );

  const temperature = float32ToCDAB(
    state.motorTemperature
  );

  // FC16 - Write Multiple Holding Registers
  await client.writeRegisters(0, [
    ...production,
    ...temperature
  ]);

  // FC06 - Write Single Holding Register
  await client.writeRegister(
    9,
    Math.round(state.motorCurrent / 0.01)
  );

  await client.writeRegister(
    19,
    state.scrapCount
  );

  // Makine durumu için ayrı adres.
  await client.writeRegister(
    20,
    state.status
  );
  // Writer'ın canlı olduğunu gösteren sayaç.
  // Makine STOPPED olsa bile artmaya devam eder.
  state.heartbeat =
  (state.heartbeat + 1) % 65536;

  await client.writeRegister(
  21,
  state.heartbeat
);
}

async function connect() {
  await client.connectTCP(HOST, { port: PORT });
  client.setID(1);
  client.setTimeout(3000);

  console.log("Connected to Docker Modbus Server");
}

async function main() {
  await connect();

  while (true) {
    try {
      updateMachine();
      await writeTelemetry();

      console.log(
        `Production=${state.productionCount} | ` +
        `Temp=${state.motorTemperature.toFixed(2)}°C | ` +
        `Current=${state.motorCurrent.toFixed(2)}A | ` +
        `Scrap=${state.scrapCount} | ` +
        `Status=${state.status}`
      );
    } catch (error) {
      console.error("Modbus error:", error.message);

      try {
        client.close();
        await connect();
      } catch (reconnectError) {
        console.error(
          "Reconnect failed:",
          reconnectError.message
        );
      }
    }

    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

main().catch(error => {
  console.error("Startup failed:", error);
  process.exitCode = 1;
});
