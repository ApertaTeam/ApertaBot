'use strict';

const fs = require('fs');

var commands;

module.exports = {
	initialize: () => {
		let textdata = fs.readFileSync('./config.json');  
		let data = JSON.parse(textdata);
		if (!data.commands){
			throw "Invalid config.json";
		}
		commands = data.commands;
	},
	processCommand: (msg, name, args) => {
		// Iterate through all the handlers
		handlers.forEach(handler => {
			// Checks if the current command handler is the one we want
			if(handler.name == `cmd_${name}`) {
				// If so, break out of the loop with a return, calling the handler as well
				return handler(msg, args); // This kinda looks like some stairs or something huh?
			}
		});
	}
};

// Command handlers (made into an array to ease the processCommand function)
let handlers = [
	function cmd_help(msg, args){
		msg.channel.send("It would appear as if I am alive right now.");
	},
	function cmd_test(msg, args){
		msg.channel.send("Testing 1 2 3");
	},
	function cmd_invite(msg, args){
		msg.client.generateInvite(['SEND_MESSAGES', 'MANAGE_GUILD', 'MENTION_EVERYONE']).then(link => {
			msg.channel.send(`Here's my invite link! ${link}`);
		});
	}
]