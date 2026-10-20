
const ModbusRTU = require("modbus-serial");

const client = new ModbusRTU();

async function main() {
  try {
    await client.connectTCP("10.0.2.2", {
      port: 5021
    });

    client.setID(1);
    client.setTimeout(3000);

    console.log("Connected to Docker Modbus Server");

    // Test verileri: Production Count = 1500
    // UInt32 ABCD formatında iki register
    await client.writeRegisters(0, [0, 1500]);

    console.log("Production registers written");

    // Temperature = 35.5, Float32 CDAB formatında
    const buffer = Buffer.alloc(4);
    buffer.writeFloatBE(35.5, 0);

    const word1 = buffer.readUInt16BE(0);
    const word2 = buffer.readUInt16BE(2);

    await client.writeRegisters(2, [word2, word1]);

    // Current = 12.5 A, ölçek 0.01
    await client.writeRegister(9, 1250);

    // Scrap = 10
    await client.writeRegister(19, 10);

    console.log("All test registers written");

    // Docker Server'dan tekrar okuyarak doğrula
    const result = await client.readInputRegisters(0, 4);

    console.log("Read back:", result.data);
  } catch (error) {
    console.error("Modbus error:", error);
  } finally {
    client.close();
  }
}

main();
