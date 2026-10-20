const ModbusRTU = require("modbus-serial");

const MachineStatus = {
	STOPPED: 0,
	RUNNING: 1,
	FAULT: 2,
};

const state = {
	status: MachineStatus.RUNNING,

	productionCount: 1000,
	motorTemperature: 25.0,
	motorCurrent: 0,
	scrapCount: 10,

};

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
	
	printState();

}


function simulateRunning(){

  state.productionCount += Math.floor(Math.random() *3) + 1;
	
   if(state.motorTemperature < 65){
	state.motorTemperature += 0.5;} 
   else{
	state.motorTemperature += (Math.random() - 0.5) *0.4 ;}
	
	state.motorTemperature = clamp(
	state.motorTemperature,
	20,
	68
);
	state.motorCurrent = 10 + Math.random() *4;

	if(Math.random() < 0.05){
	state.scrapCount += 1;
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
	
	state.motorCurrent = Math.max(
	0,
	state.motorCurrent - 1,
);

}

function simulateFault(){

	state.motorTemperature += 1;
	
	state.motorTemperature = Math.min(
		state.motorTemperature,
		100,		
);

	state.motorCurrent = 18 + Math.random() * 5;

}


function printState(){

	const statusName = 
		Object.keys(MachineStatus).find(
		key => MachineStatus[key]  === state.status
);
	console.clear();

	console.log("--------------------------");
	console.log("factoredge - Prod line 1 ");
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

	setInterval(updateMachine, 1000);
	

function uint32ToWords(value){

	const buffer = Buffer.alloc(4);
	
	buffer.writeUInt32BE(value, 0);

	return [
		buffer.readUInt16BE(0),
		buffer.readUInt16BE(2),
];
}

function float32ToCDAB(value) {
	const buffer = Buffer.alloc(4);
	
	buffer.writeFloatBE(value, 0);
	
	const word1 = buffer.readUInt16BE(0);
	const word2 = buffer.readUInt16BE(2);

	return [word2, word1];

}



const vector = {

	getInputRegister : function (addr) {
	
	if(addr === 0 || addr === 1){
	const words = 
		uint32ToWords(state.productionCount);

	return words[addr];

}
	if(addr === 2 || addr === 3){

	const words = 
		float32ToCDAB(state.motorTemperature);

	return words[addr - 2];
}

	if(addr === 9){
	return Math.round(
		state.motorCurrent / 0.01
	);
}


	if(addr === 19){

	return state.scrapCount;
}

return 0;
},

getHoldingRegister: function(addr) {


	if(addr ===0){
	return state.status;
}

return 0;
},
};

const server = new ModbusRTU.ServerTCP(
  vector,
  {
   host: "0.0.0.0",
   port: 5020,
   debug: true,
   unitID: 1
  }
);

console.log("factoredge modbus sim...");
console.log("listening port 5020");

