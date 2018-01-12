'use strict';

const fs = require('fs');
const Discord = require('discord.js');
const logger = require("./logger.js");

var commands;
/**
 * @type {Array}
 */
var creators;
var storage;

module.exports = {
	initialize: (storageHandler) => {		
		let data = require('../config.json');
		if (!data.commands){
			throw "Invalid config.json";
		}
		commands = data.commands;
		creators = data.creatorIds;
		storage = storageHandler;
	},
	processCommand: (msg, name, args) => {
		let found = false;
		// Iterate through all the handlers
		handlers.forEach(handler => {
			// Checks if the current command handler is the one we want
			if(handler.name == `cmd_${name}`) {
				// If so, break out of the loop with a return, calling the handler as well
				found = true;
				return handler(msg, args);
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

/**
 * A helper function for the eval command
 * @param {string} code 
 */
function evaluate (code) {
	return new Promise((resolve, reject) => {
		try {
			var evaledCode = eval(code);
			if(evaledCode instanceof Promise)
				return evaledCode.then(resolve);
			return resolve(evaledCode);
		} catch (e) {
			reject(e);
		}
	});
}

var tempPrefix = "prefix!";

function get_command_syntax(name){
	let found = false;
	let syntax = undefined;
	commands.forEach(command => {
		if(command.name == name){
			found = true;
			syntax = command.syntax.replace("[PREFIX]", tempPrefix);
		}
	});
	if(!found){
		logger.logError("Failed to get syntax for a command");
		return "<failed to find command, invalid configuration>";
	} else {
		return syntax;
	}
}

// Command handlers (made into an array to ease the processCommand function)
let handlers = [
	function cmd_help(msg, args){
		if(args.length == 1){
			let found = false;
			// Loop through the commands config, find the command
			commands.forEach(command => {
				if(command.name == args[0]){
					found = true;
					msg.author.send(`\`\`\`\nSyntax for command ${args[0]}:\n${get_command_syntax(args[0])}\n\`\`\``);
				}
			});
			// If it doesn't exist, display an error
			if(!found){
				msg.author.send("That command doesn't exist!");
			}
		} else {
			// Display syntax and commands
			let stringBuild = "```\n";
			stringBuild += `Syntax:\n${get_command_syntax('help')}\n\nCommands:\n`;
			commands.forEach(command => {
				if(command.name == "help")
					return;
				stringBuild += `\n--- ${command.name} ---\n${command.description}\n${get_command_syntax(command.name)}\n`;
			});
			stringBuild += "\n```";
			if(stringBuild.length >= 2000){
				logger.logError("Help command string is too long, requires updating");
				return;
			}
			msg.author.send(stringBuild);
		}
	},
	function cmd_test(msg, args){
		var embed = new Discord.RichEmbed()
			.addField("Command", "test")
			.addField("Arguments", args.toString().replace(/,/g, ", "))
			.addField("Is Creator?", creators.indexOf(msg.author.id) != -1 ? "True" : "False")
			.setColor("#ff0000");
		msg.channel.send(`Testing 1 2 3`, {embed});
	},
	function cmd_invite(msg, args){
		msg.client.generateInvite(['SEND_MESSAGES', 'MANAGE_GUILD', 'MENTION_EVERYONE']).then(link => {
			msg.channel.send(`Here's my invite link! ${link}`);
		});
	},
	function cmd_prefix(msg, args){
		var guildid = msg.guild.id;
		var prefix = {};
		storage.addInGuild(guildid, "prefix", args[0] != undefined ? args[0] : null);		
		msg.channel.send(`The prefix is now: ${args[0] != undefined ? args[0] : "a direct ping to the bot!"}`);
	},
	function cmd_eval(msg, args){
		// Just to make sure people don't use it to exploit the bot and shizzle ;P
		if(!creators.includes(msg.author.id)) return msg.channel.send("Only the bot owner(s) can use this command!");
		var code = args.join(' ');
		evaluate(code).then(evaled => {						
			// This will give us the stringified version of the returned evaluated code.
			var evaledString = require('util').inspect(evaled);

			// Embed fields have a character limit of 1024 characters, so if the string goes over 1014 (1024 - markdown code) characters, shorten it so it fits.
			if(evaledString.length > 1014) evaledString = `{${evaled.constructor.name}: "${evaled.toString()}"}`;

			// Because I like to be stylish, I'm making an embed :3
			const embed = new Discord.RichEmbed()
				.setTimestamp()
				.setColor(msg.guild.me.displayHexColor)
				.addField('**Eval Input**', '```js\n' + code + '\n```')
				.addField('**Eval Output**', '```js\n' + evaledString + '\n```');

			return msg.channel.send({embed});		
		}, reject => {
			// I'm logging the actual stack to the console just in case it's a code error
			logger.logError(reject.stack);

			// While here I'm just sending the error message, as the user doesn't need the whole stack
			return msg.channel.send(`Eval rejected with the following error: ${reject.message}`);
		}).catch(err => {
			// Same as above.
			logger.logError(err.stack);
			return msg.channel.send(`Eval returned the following error: ${err.message}`);
		});
	}
]