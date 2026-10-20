
const ModbusRTU = require("modbus-serial");

const inputRegisters = new Uint16Array(100);
const holdingRegisters = new Uint16Array(100);
// Ubuntu Writer buraya yazacak.
// NestJS mevcut Input Register adreslerinden okuyacak.

const vector = {
  getInputRegister(address) {
    return inputRegisters[address] ?? 0;
  },

  getHoldingRegister(address) {
    return holdingRegisters[address] ?? 0;
  },

  // Ubuntu Writer, holding register'lara yazar.
  setRegister(address, value) {
    if (
      !Number.isInteger(address) ||
      address < 0 ||
      address >= holdingRegisters.length
    ) {
      throw new Error(`Invalid register address: ${address}`);
    }

    holdingRegisters[address] = value;

    // Telemetri alanlarını NestJS'in mevcut
    // Input Register haritasına yansıtıyoruz.
    if ([0, 1, 2, 3, 9, 19].includes(address)) {
      inputRegisters[address] = value;
    }

    console.log(`Register ${address} = ${value}`);
  }
};


const server = new ModbusRTU.ServerTCP(vector, {
  host: "0.0.0.0",
  port: 5020,
  unitID: 1,
  debug: false
});

console.log("FactorEdge Modbus TCP Server started");
console.log("Listening on port 5020");
