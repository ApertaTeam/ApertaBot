'use strict';

const fs = require('fs');
const Discord = require('discord.js');
const logger = require("./logger.js");

var commands;
var creators;
var storage;

module.exports = {
	initialize: (storageHandler) => {
		//let textdata = fs.readFileSync('./config.json');  
		let data = require('../config.json');//JSON.parse(textdata);
		if (!data.commands){
			throw "Invalid config.json";
		}
		commands = data.commands;
		creators = data.creatorIds;
		storage = storageHandler;
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
		return "An error occurred";
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
	}
]