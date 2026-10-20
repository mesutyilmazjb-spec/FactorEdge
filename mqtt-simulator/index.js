const mqtt = require("mqtt");

const MachineStatus = {
	STOPPED: 0,
	RUNNING: 1,
	FAULT: 2,
};

function loadConfig() {
  const configPath = path.join(
    __dirname,
    "config.json"
  );

  const config = JSON.parse(
    fs.readFileSync(configPath, "utf8")
  );

  if (MachineStatus[config.machineStatus] === undefined) {
    throw new Error(
      `Invalid machine status: ${config.machineStatus}`
    );
  }

  if (
    typeof config.brokerUrl !== "string" ||
    !/^mqtts?:\/\/.+/.test(config.brokerUrl)
  ) {
    throw new Error("Invalid MQTT broker URL");
  }

  if (
    typeof config.topic !== "string" ||
    !config.topic.trim() ||
    /[+#]/.test(config.topic)
  ) {
    throw new Error("Invalid MQTT topic");
  }

  return config;
}

const config = loadConfig();

const state = {
    status: MachineStatus[config.machineStatus],	productionCount: 5000,
	motorTemperature: 25,
	motorCurrent: 0,
	scrapCount: 30,

};

const BROKER_URL = config.brokerUrl;
const TOPIC = config.topic;

const client = mqtt.connect(BROKER_URL);

client.on("connect", () => {
	console.log("Connected to Mosquitto");
	console.log("Publishing to:");
	console.log(TOPIC);
});

client.on("error", (error) => {
	console.error(
		"MQTT error:",
		error.message
);
});


function clamp(value, min, max){
	return Math.min(Math.max(value,min), max);
}


function updateMachine(){
	switch (state.status){
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

function simulateRunning(){

  state.productionCount += Math.floor(Math.random() * 4) + 1;
	
   if(state.motorTemperature < 67){
	state.motorTemperature += 0.4;} 
   else{
	state.motorTemperature += (Math.random() - 0.5) *0.4 ;}
	
	state.motorTemperature = clamp(
	state.motorTemperature,
	20,
	70
);
	state.motorCurrent = 11 + Math.random() * 5;

	if(Math.random() < 0.04){
	state.scrapCount ++;
}
}

function simulateStopped() {
	
	if(state.motorTemperature > 25){
		state.motorTemperature -= 0.5;
	}

	state.motorTemperature = Math.max(
		state.motorTemperature,
		25,
);
	
	state.motorCurrent = 0;

}

function simulateFault(){
	
	state.motorTemperature = Math.min(
		state.motorTemperature + 1,
		100,		
);

	state.motorCurrent = 19 + Math.random() * 5;

}

function publishTelemetry(){

updateMachine();

const message = {
	productionCount: state.productionCount,
	motorTemperature: Number(state.motorTemperature.toFixed(2)),
 	motorCurrent: Number(state.motorCurrent.toFixed(2)),
	scrapCount: state.scrapCount,
	status: state.status,
	timestamp: new Date().toISOString(), 

};
	client.publish(
		TOPIC,
		JSON.stringify(message));

	console.log(message);
}

function printState(){

	const statusName = 
		Object.keys(MachineStatus).find(
		key => MachineStatus[key]  === state.status
);
	console.clear();

	console.log("--------------------------");
	console.log("factoredge - Prod line 2 ");
	console.log("--------------------------");

	console.log("status");
	console.log(statusName);

	console.log("Production");
	console.log(state.productionCount);

	console.log("temp");
	console.log(state.motorTemperature.toFixed(2));

	console.log("current");
	console.log(state.motorCurrent.toFixed(2));

	console.log("scrap");
	console.log(state.scrapCount);

	console.log("----------------------------")


}

setInterval(publishTelemetry, 1000);

