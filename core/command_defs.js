const fs = require('fs');
const Discord = require('discord.js');
const logger = require("./logger.js");
const voice = require("./voice.js");

var CommandStatus = {
	Success: 0,
	InvalidSyntax: 1,
	NoPermission: 2,
	NoAdminPermission: 3,
	BotAdminsOnly: 4,
	InternalError: 5,
	TooLong: 6
};

var commands;
/**
 * @type {Array}
 */
var creators;
var storage;
let dclient;

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
	get_command_syntax: get_command_syntax,
	handlers: [
		function cmd_help(msg, args){
			return new Promise(resolve => {
				if(args.length == 1){
					let found = false;
					// Loop through the commands config, find the command
					commands.forEach(command => {
						if(command.name == args[0]){
							found = true;
							msg.channel.send(`\`\`\`yaml\nSyntax for command "${args[0]}":\n${get_command_syntax(args[0], msg.prefix)}\n\`\`\``);
						}
					});
					// If it doesn't exist, display an error
					if(!found){
						msg.author.send("That command doesn't exist!");
					}
				} else {
					// Display syntax and commands
					let stringBuild = "```yaml\n";
					stringBuild += `Syntax:\n${get_command_syntax('help', msg.prefix)}\n\nCommands:\n`;
					commands.forEach(command => {
						if(command.name == "help")
							return;
						stringBuild += `\n--- ${command.name} ---\n${command.description}\n${get_command_syntax(command.name, msg.prefix)}\n`;
					});
					stringBuild += "\n```";
					if(stringBuild.length >= 2000){
						logger.logError("Help command string is too long, requires updating");
						resolve(CommandStatus.InternalError);
					}
					msg.author.send(stringBuild);
				}
				resolve(CommandStatus.Success);
			});
		},
		function cmd_test(msg, args){
			return new Promise(resolve => {
				msg.channel.send("I'm alive!");
				resolve(CommandStatus.Success);
			});
		},
		function cmd_ping(msg, args){
			return new Promise(resolve => {
				var then = Date.now();
				msg.channel.send("Pinging...").then(m => m.edit(`Pong!\n\`\`\`yaml\n--- Latency ---\n${Date.now() - then}ms\n\n--- Ping ---\n${m.client.ping.toFixed(2)}ms\n\`\`\``));
				resolve(CommandStatus.Success);
			});
		},
		function cmd_invite(msg, args){
			return new Promise(resolve => {
				msg.client.generateInvite(['SEND_MESSAGES', 'MANAGE_GUILD', 'MENTION_EVERYONE']).then(link => {
					msg.channel.send(`Here's my invite link! ${link}`);
					resolve(CommandStatus.Success);
				});
			});
		},
		function cmd_prefix(msg, args){
			return new Promise(resolve => {
				if(!msg.member)
					resolve(CommandStatus.NoPermission);
				if(!msg.member.hasPermission('ADMINISTRATOR'))
					resolve(CommandStatus.NoAdminPermission);
				if (args.length > 1)
					resolve(CommandStatus.InvalidSyntax);
				var guildid = msg.guild.id;
				var prefix = {};
				if (args[0] != undefined){
					if (args[0].length > 6){
						msg.channel.send("Sorry, the maximum length for a prefix is **6** characters.");
						resolve(CommandStatus.Success);
					}
				}
				storage.addInGuild(guildid, "prefix", args[0] != undefined ? args[0] : null).then(() => {
					msg.channel.send(`The prefix is now: ${args[0] != undefined ? args[0] : `A direct ping to the bot! For example:\n<@${msg.client.user.id}>`}`);
					resolve(CommandStatus.Success);
				});
			});
		},
		function cmd_addbotadmin(msg, args){
			return new Promise(resolve => {
				if(!creators.includes(msg.author.id))
					resolve(CommandStatus.BotAdminsOnly);
				if(!msg.mentions.users.size)
					resolve(CommandStatus.InvalidSyntax);

				// Loop through mentions, ignoring any users that are already bot admins
				msg.mentions.users.forEach(user => {
					if(!creators.includes(user.id))
						creators.push(user.id);
				});

				// Grab the config.json as an object for easy access
				var tempJson = require('../config.json');

				tempJson["creatorIds"] = creators;

				try {
					fs.writeFileSync("config.json", JSON.stringify(tempJson, null, 4));
				} catch (e) {
					logger.logError(e.stack);
					resolve(CommandStatus.InternalError);
				}

				if(msg.mentions.users.size > 1)
					msg.channel.send("Successfully added bot admins.");
				else
					msg.channel.send("Successfully added bot admin.");

				resolve(CommandStatus.Success);
			});
		},
		function cmd_removebotadmin(msg, args){
			return new Promise(resolve => {
				if(!creators.includes(msg.author.id))
					resolve(CommandStatus.BotAdminsOnly);
				if(!msg.mentions.users.size)
					resolve(CommandStatus.InvalidSyntax);

				// Loop through mentions, ignoring any users that aren't bot admins
				msg.mentions.users.forEach(user => {
					if(creators.includes(user.id) && (user.id != msg.author.id))
						creators.splice(creators.indexOf(user.id), 1);
				});

				// Grab the config.json as an object for easy access
				var tempJson = require('../config.json');

				tempJson["creatorIds"] = creators;

				try {
					fs.writeFileSync("config.json", JSON.stringify(tempJson, null, 4));
				} catch (e) {
					logger.logError(e.stack);
					resolve(CommandStatus.InternalError);
				}

				if(msg.mentions.users.size > 1)
					msg.channel.send("Successfully removed bot admins.")
				else
					msg.channel.send("Successfully removed bot admin.");
				resolve(CommandStatus.Success);
			});
		},
		function cmd_docs(msg, args){
			return new Promise(resolve => {
				if(!creators.includes(msg.author.id))
					resolve(CommandStatus.BotAdminsOnly);
				if(args.length != 1)
					resolve(CommandStatus.InvalidSyntax);
				var baseURL = `https://discord.js.org/#/docs/main/${Discord.version.substring(0,Discord.version.lastIndexOf('.'))}.0`;
				var querys = args[0].split("#");
				if(querys.length == 1) {
					if(querys[0].startsWith('.')){
						msg.channel.send(`${baseURL}/typedef/${querys[0]}`);
						resolve(CommandStatus.Success);
					}
					msg.channel.send(`${baseURL}/class/${querys[0]}`);
				} else if(querys.length == 2) {
					msg.channel.send(`${baseURL}/class/${querys[0]}?scrollTo=${querys[1]}`);
				} else {
					msg.channel.send("Incorrect format.");
				}
				resolve(CommandStatus.Success);
			});
		},
		function cmd_eval(msg, args){
			return new Promise(resolve => {
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

					msg.channel.send({embed});
					resolve(CommandStatus.Success);
				}, reject => {
					// I'm logging the actual stack to the console just in case it's a code error
					logger.logError(reject.stack);

					// While here I'm just sending the error message, as the user doesn't need the whole stack
					msg.channel.send(`Eval rejected with the following error: ${reject.message}`);
					resolve(CommandStatus.InternalError);
				}).catch(err => {
					// Same as above.
					logger.logError(err.stack);
					msg.channel.send(`Eval returned the following error: ${err.message}`);
					resolve(CommandStatus.InternalError);
				});
			});
		},
		function cmd_joinvoice(msg, args){
			return new Promise(resolve => {
				if(args.length > 0)
					resolve(CommandStatus.InvalidSyntax);
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
				resolve(CommandStatus.Success);
			});
		},
		function cmd_leavevoice(msg, args){
			return new Promise(resolve => {
				if(args.length > 0)
					resolve(CommandStatus.InvalidSyntax);
				if(voice.disconnect(msg.member)){
					msg.channel.send("Disconnected from voice channel.");
				} else {
					msg.channel.send("I'm not currently in a voice channel with you.");
				}
				resolve(CommandStatus.Success);
			});
		},
		function cmd_testmusic(msg, args){
			return new Promise(resolve => {
				if(args.length > 0)
					resolve(CommandStatus.InvalidSyntax);
				voice.playLocalFile(msg.member, `${require('app-root-path')}/resources/For Future Use One.mp3`);
				resolve(CommandStatus.Success);
			});
		},
		function cmd_modlog(msg, args){
			return new Promise(resolve => {
				let confirmFilter = (m) => {
					if((m.content.toLowerCase().startsWith("yes") || m.content.toLowerCase().startsWith("no")) && m.author.id == msg.author.id) {
						return true;
					} else {
						return false;
					}
				};
				let awaitError = (res) => {
					// If res.message is defined then an actual error occured
					if(res.message) {
						logger.logError(res.stack);
						resolve(CommandStatus.InternalError);
					}
					// Otherwise it's just the timer ran out
					else {
						msg.channel.send("Command timeout.").then(m => m.delete(5e3));
						resolve(CommandStatus.Success);
					}
				};
				if(!msg.member.hasPermission("MANAGE_CHANNELS")) {
					resolve(CommandStatus.NoAdminPermission);
				}
				storage.findInGuild(msg.guild.id, "log").then(logChannel => {
					// There's currently no log channel, so go through creation logic
					if(!logChannel) {
						// If no options are provided, go with defaults
						if(!args.length) {
							let toEdit = msg.channel.send("You've asked me to start logging this server but didn't give me a channel, want me to create one?\nRespond with \"yes\" if you want me to create a new channel.\nRespond with \"no\" if you want to cancel this command.");
							msg.channel.awaitMessages(confirmFilter, { max: 1, time: 10e3, errors: ['time']}).then(response => {
								// Create the channel
								if(response.first().content.toLowerCase().startsWith("yes")) {
									if(msg.guild.channels.some(channel => {
										return channel.name == "server-log";
									})) {
										msg.channel.send(`There's already a channel named \"server-log\" in this guild.\nEither delete it or specify a channel to use e.g. ${msg.prefix}modlog #server-log`);
										resolve(CommandStatus.Success);
										return;
									}
									// TODO: Clean up cuz holy shit is it fuckin' dirty in here, my god.
									if(msg.guild.me.hasPermission("MANAGE_CHANNELS")) {
										msg.guild.createChannel("server-log", "text", [{
											allow: ["VIEW_CHANNEL"],
											deny: ["SEND_MESSAGES"],
											id: msg.guild.defaultRole
										},{
											allow: ["SEND_MESSAGES"],
											deny: [],
											id: msg.guild.me
										}]).then(chan => {
											storage.addInGuild(msg.guild.id, "log", chan.id).then(() => {
												msg.channel.send("Successfully added log channel.");
												resolve(CommandStatus.Success);
											});
										});
									} else {
										msg.channel.send("I don't have the permissions to create the Channel!");
										resolve(CommandStatus.InternalError);
									}
								} else {
									toEdit.then(m => m.delete());
									response.first().delete(5e3);
									msg.channel.send("Command canceled.");
									resolve(CommandStatus.Success);
								}
							})
							// After 10 seconds, await messages throws an error because the timer ran out.
							.catch(awaitError);
						} else {
							var channel = msg.mentions.channels;
							if(channel.size != 1) {
								resolve(CommandStatus.InvalidSyntax);
								return;
							}
							channel = channel.first();
							if(channel.permissionsFor(msg.guild.me).has("SEND_MESSAGES")) {
								var toEdit = msg.channel.send(`You've asked me to use ${channel} as a log channel, is this alright?\nYes or No?`);
								msg.channel.awaitMessages(confirmFilter, { max: 1, time: 10e3, errors: ['time']}).then(response => {
									if(response.first().content.toLowerCase().startsWith("yes")) {
										storage.addInGuild(msg.guild.id, "log", channel.id).then(() => {
											msg.channel.send("Successfully added log channel.");
											resolve(CommandStatus.Success);
										});
									} else {
										toEdit.then(m => m.delete());
										response.first().delete(5e3);
										msg.channel.send("Command canceled.");
										resolve(CommandStatus.Success);
									}
								}).catch(awaitError);
							} else {
								msg.channel.send("I can't send messages in that chat!");
								resolve(CommandStatus.Success);
							}
						}
					} else {
						// No channels or options specified
						if(!args.length) {
							let toEdit = msg.channel.send(`This server already has a log channel, ${msg.guild.channels.get(logChannel)}, would you like to stop logging?\nYes or No?`);
							msg.channel.awaitMessages(confirmFilter, { max: 1, time: 10e3, errors: ['time']}).then(response => {
								if(response.first().content.toLowerCase().startsWith("yes")) {
									storage.removeInGuild(msg.guild.id, "log").then(() => {
										msg.channel.send("Successfully stopped logging.");
										resolve(CommandStatus.Success);
									});
								} else {
									toEdit.then(m => m.delete());
									response.first().delete(5e3);
									msg.channel.send("Command canceled.");
									resolve(CommandStatus.Success);
								}
							}).catch(awaitError);
						} else {
							var channel = msg.mentions.channels;
							if(channel.size != 1) {
								resolve(CommandStatus.InvalidSyntax);
								return;
							}
							channel = channel.first();
							if(channel.permissionsFor(msg.guild.me).has("SEND_MESSAGES")) {
								let toEdit = msg.channel.send(`This server already has a log channel, ${msg.guild.channels.get(logChannel)}, do you want to switch to ${channel}?\nYes or No?`);
								msg.channel.awaitMessages(confirmFilter, { max: 1, time: 10e3, errors: ['time']}).then(response => {
									if(response.first().content.toLowerCase().startsWith("yes")) {
										storage.addInGuild(msg.guild.id, "log", channel.id).then(() => {
											msg.channel.send("Successfully switched log channels.");
											resolve(CommandStatus.Success);
										});
									} else {
										toEdit.then(m => m.delete());
										response.first().delete(5e3);
										msg.channel.send("Command canceled.");
										resolve(CommandStatus.Success);
									}
								}).catch(awaitError);
							} else {
								msg.channel.send("I can't send messages in that chat!");
								resolve(CommandStatus.Success);
							}
						}
						resolve(CommandStatus.Success);
					}
				});
			});
		},
		function cmd_tag(msg, args){
			return new Promise(resolve => {
				for(var i = 0; i < args.length; i++) {
					if(args[i].startsWith('"'))
						args[i] = args[i].replace(/"/g, "")
					else if(args[i].startsWith("'"))
						args[i] = args[i].replace(/'/g, "");
				}
				if(args[0] == "create") {
					if(!(args[1]) || !(args[2]))
					resolve(CommandStatus.InvalidSyntax);
					storage.findInGuild(msg.guild.id, "tag").then(tags => {
						var found = false;
						var newTags = [];
						if(tags) {
							tags.forEach(tag => {
								if(tag.name == args[1]) {
									found = true;
								}
								newTags.push(tag);
							});
						}
						if(found) {
							msg.channel.send("There is already a tag with that name on this server.");
							resolve(CommandStatus.Success);
						}
						newTags.push({
							name: args[1],
							owner: {
								name: msg.author.username,
								id: msg.author.id
							},
							contents: args[2]
						});
						storage.addInGuild(msg.guild.id, "tag", newTags).then(() => {
							msg.channel.send(`Successfully added your tag: ${args[1]}`);
							resolve(CommandStatus.Success);
						});
					});
				} else if (args[0] == "list") {
					storage.findInGuild(msg.guild.id, "tag").then(tags => {
						var tagnames = [];
						if(tags) {
							tags.forEach(tag => {
								if(tag.owner.id == msg.author.id)
								tagnames.push(tag.name);
							});
						}
						if(!tagnames.length) {
							tagnames.push("None!");
						}
						var finalmsg = `Tags in server ${msg.guild.name}:\n`;
						tagnames.forEach(tag => {
							finalmsg += tag + "\n";
						});
						msg.author.send(finalmsg);
						resolve(CommandStatus.Success);
					});
				} else if (args[0] == "delete") {
					if(!(args[1]))
						resolve(CommandStatus.InvalidSyntax);
					storage.findInGuild(msg.guild.id, "tag").then(tags => {
						var newtags = [];
						var found = false;
						if(tags) {
							tags.forEach(tag => {
								if(tag.name == args[1]) {
									if(tag.owner.id != msg.author.id) {
										msg.channel.send("This tag doesn't belong to you!");
										found = true;
									} else {
										msg.channel.send("Successfully deleted tag.");
										found = true;
										return;
									}

								}
								newtags.push(tag);
							});
						}
						if(!found) {
							msg.channel.send("Couldn't find the specified tag.");
							resolve(CommandStatus.Success);
						}
						storage.addInGuild(msg.guild.id, "tag", newtags);
						resolve(CommandStatus.Success);
					});
				} else {
					if(!(args[0]))
						resolve(CommandStatus.InvalidSyntax);
					storage.findInGuild(msg.guild.id, "tag").then(tags => {
						var found = false;
						if(tags) {
							tags.forEach(tag => {
								if(tag.name == args[0]) {
									found = true;
									return msg.channel.send(`${tag.contents}`);
								}
							});
						}
						if(!found) {
							msg.channel.send(`Couldn't find the tag "${args[0]}"`);

						}
						resolve(CommandStatus.Success);
					});
				}
			});
		}
	]
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
			syntax = command.syntax.replace(/\[PREFIX\]/g, prefix);
		}
	});
	if(!found){
		logger.logError("Failed to get syntax for a command");
		return "<failed to find command, invalid configuration>";
	} else {
		return syntax;
	}
}

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
