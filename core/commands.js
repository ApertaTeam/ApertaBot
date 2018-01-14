'use strict';

const defs = require("./command_defs.js");

var CommandStatus = {
	Success: 0,
	InvalidSyntax: 1,
	NoPermission: 2,
	NoAdminPermission: 3,
	BotAdminsOnly: 4,
	InternalError: 5
};

module.exports = {
	initialize: defs.initialize,
	processCommand: (msg, name, args) => {
		let found = false;		
		// Iterate through all the handlers
		defs.handlers.forEach(handler => {
			// Checks if the current command handler is the one we want
			if(handler.name == `cmd_${name}`) {
				// If so, break out of the loop with a return, calling the handler as well
				found = true;
				let status = handler(msg, args);
				if(status != CommandStatus.Success){
					switch(status){
						case CommandStatus.InvalidSyntax:
							msg.channel.send(`Invalid command syntax.\nProper syntax:\n\`\`\`\n${defs.get_command_syntax(name, msg.prefix)}\n\`\`\``);
							break;
						case CommandStatus.NoPermission:
							msg.channel.send("You do not have permissions to do that.");
							break;
						case CommandStatus.NoAdminPermission:
							msg.channel.send("You must be a server administrator to do that.");
							break;
						case CommandStatus.InternalError:
							msg.channel.send("An internal error occurred when executing that command.");
							break;
						case CommandStatus.BotAdminsOnly:
							msg.channel.send("Only bot administrators can do that.");
							break;
						default:
							msg.channel.send("Something went wrong internally.\nTechnical details: Command function returned invalid CommandStatus code.");
							break;
					}
				}
			}
		});
		if(!found){
			// Alert the user that the command was not recognized.
			msg.channel.send("Command not recognized.");
		} else {
			// Perform any post-processing if necessary
		}
	}
};