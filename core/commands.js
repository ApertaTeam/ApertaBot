'use strict';

const fs = require('fs');

var commands;

module.exports = {
	initialize: () => {
		let textdata = fs.readFileSync('../config.json');  
		let data = JSON.parse(textdata);
		if (!data.commands){
			throw "Invalid config.json";
		}
		commands = data.commands;
	}
	processCommand: (msg, name, args) => {

	}
};

// Command handlers

function cmd_help(msg, args){
	msg.channel.send("It would appear as if I am alive right now.");
}