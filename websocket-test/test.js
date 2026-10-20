const { io } = require("socket.io-client");

const socket = io("http://localhost:3000");

socket.on("connect", () => {
  console.log(
    "CONNECTED:",
    socket.id
  );
});

socket.on("telemetry", (data) => {
  console.log(
    "TELEMETRY:",
    data
  );
});

socket.on("device-status", (data) => {
  console.log(
    "DEVICE STATUS:",
    data
  );
});

socket.on("disconnect", () => {
  console.log("DISCONNECTED");
});