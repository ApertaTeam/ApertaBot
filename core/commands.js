'use strict';

const fs = require('fs');
const Discord = require('discord.js');
const logger = require("./logger.js");
const voice = require("./voice.js");

var commands;
/**
 * @type {Array}
 */
var creators;
var storage;
let dclient;

var CommandStatus = {
	Success: 0,
	InvalidSyntax: 1,
	NoPermission: 2,
	NoAdminPermission: 3,
	BotAdminsOnly: 4,
	InternalError: 5
};

module.exports = {
	initialize: (storageHandler, client) => {
		logger.logInfo("Initializing command module");

		// Load config.json
		let data = require('../config.json');
		if (!data.commands || !data.creatorIds){
			throw new Error("Invalid config.json");
		}

		// Assign variables for use later
		commands = data.commands;
		creators = data.creatorIds;
		storage = storageHandler;
		dclient = client;
	},
	processCommand: (msg, name, args) => {
		let found = false;
		// Iterate through all the handlers
		handlers.forEach(handler => {
			// Checks if the current command handler is the one we want
			if(handler.name == `cmd_${name}`) {
				// If so, break out of the loop with a return, calling the handler as well
				found = true;
				let status = handler(msg, args);
				if(status != CommandStatus.Success){
					switch(status){
						case CommandStatus.InvalidSyntax:
							msg.channel.send(`Invalid command syntax.\nProper syntax:\n\`\`\`\n${get_command_syntax(name, msg.prefix)}\n\`\`\``);
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

function get_command_syntax(name, prefix){
	if(prefix.startsWith("<@")){
		if(prefix == `<@${dclient.user.id}>`){
			prefix = `<@${dclient.user.username}> `;
		}
	}
	let found = false;
	let syntax = undefined;
	commands.forEach(command => {
		if(command.name == name){
			found = true;
			syntax = command.syntax.replace("[PREFIX]", prefix);
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
					msg.author.send(`\`\`\`\nSyntax for command "${args[0]}":\n${get_command_syntax(args[0], msg.prefix)}\n\`\`\``);
				}
			});
			// If it doesn't exist, display an error
			if(!found){
				msg.author.send("That command doesn't exist!");
			}
		} else {
			// Display syntax and commands
			let stringBuild = "```\n";
			stringBuild += `Syntax:\n${get_command_syntax('help', msg.prefix)}\n\nCommands:\n`;
			commands.forEach(command => {
				if(command.name == "help")
					return;
				stringBuild += `\n--- ${command.name} ---\n${command.description}\n${get_command_syntax(command.name, msg.prefix)}\n`;
			});
			stringBuild += "\n```";
			if(stringBuild.length >= 2000){
				logger.logError("Help command string is too long, requires updating");
				return CommandStatus.InternalError;
			}
			msg.author.send(stringBuild);
		}
		return CommandStatus.Success;
	},
	function cmd_test(msg, args){
		msg.channel.send("I'm alive!");
		return CommandStatus.Success;
	},
	function cmd_invite(msg, args){
		msg.client.generateInvite(['SEND_MESSAGES', 'MANAGE_GUILD', 'MENTION_EVERYONE']).then(link => {
			msg.channel.send(`Here's my invite link! ${link}`);
		});
		return CommandStatus.Success;
	},
	function cmd_prefix(msg, args){
		if(!msg.member)
			return CommandStatus.NoPermission;
		if(!msg.member.hasPermission('ADMINISTRATOR'))
			return CommandStatus.NoAdminPermission;
		if (args.length > 1) 
			return CommandStatus.InvalidSyntax;
		var guildid = msg.guild.id;
		var prefix = {};
		if (args[0] != undefined){
			if (args[0].length > 6){
				msg.channel.send("Sorry, the maximum length for a prefix is **6** characters.");
				return CommandStatus.Success;
			}
		}
		storage.addInGuild(guildid, "prefix", args[0] != undefined ? args[0] : null).then(() => {		
			msg.channel.send(`The prefix is now: ${args[0] != undefined ? args[0] : `A direct ping to the bot! For example:\n<@${msg.client.user.id}>`}`);
		});
		return CommandStatus.Success;
	},
	function cmd_sudo(msg, args){
		if(!creators && msg.author);
		if(!creators.includes(msg.author.id)) 
			return CommandStatus.BotAdminsOnly;
		return CommandStatus.Success;
	},
	function cmd_docs(msg, args){
		if(!creators.includes(msg.author.id)) 
			return CommandStatus.BotAdminsOnly;
		if(args.length != 1) 
			return CommandStatus.InvalidSyntax;
		var baseURL = `https://discord.js.org/#/docs/main/${Discord.version.substring(0,Discord.version.lastIndexOf('.'))}.0`;
		var querys = args[0].split("#");
		if(querys.length == 1) {
			if(querys[0].startsWith('.')){
				msg.channel.send(`${baseURL}/typedef/${querys[0]}`);
				return CommandStatus.Success;
			}
			msg.channel.send(`${baseURL}/class/${querys[0]}`);
		} else if(querys.length == 2) {
			msg.channel.send(`${baseURL}/class/${querys[0]}?scrollTo=${querys[1]}`);
		} else {
			msg.channel.send("Incorrect format.");
		}
		return CommandStatus.Success;
	},
	function cmd_eval(msg, args){
		// Just to make sure people don't use it to exploit the bot and shizzle ;P
		if(!creators.includes(msg.author.id))
			return CommandStatus.BotAdminsOnly;
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
		return CommandStatus.Success;
	},
	function cmd_joinvoice(msg, args){
		if(args.length > 0)
			return CommandStatus.InvalidSyntax;
		let join = voice.joinUserChannel(msg.member);
		if(join instanceof Promise){
			var toEdit = msg.channel.send("Connecting to the voice channel...");
			join.then(connection => {
				toEdit.then(m => {
					m.edit("Connected successfully to the voice channel.");
				});
			});
		} else {
			if(join == voice.VoiceFailStatus.MaxChannelsInUse){
				msg.channel.send("Sorry, but I've reached my maximum amount of voice channels! Wait for some to end.");
			} else if(join == voice.VoiceFailStatus.NotInChannel){
				msg.channel.send("You must join a voice channel first.");
			}
		}
		return CommandStatus.Success;
	},
	function cmd_leavevoice(msg, args){
		if(args.length > 0)
			return CommandStatus.InvalidSyntax;
		if(voice.disconnect(msg.member)){
			msg.channel.send("Disconnected from voice channel.");
		} else {
			msg.channel.send("I'm not currently in a voice channel with you.");
		}
		return CommandStatus.Success;
	},
	function cmd_testmusic(msg, args){
		if(args.length > 0)
			return CommandStatus.InvalidSyntax;
		voice.playLocalFile(msg.member, `${require('app-root-path')}/resources/For Future Use One.mp3`);
		return CommandStatus.Success;
	}
];