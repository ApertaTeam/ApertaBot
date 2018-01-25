'use strict';

const logger = require("./core/logger.js");
logger.setLogLevel(require('./config.json').logLevel);

logger.logPlain("\\/\\/\\/---------------\\/\\/\\/");
logger.logPlain(`ApertaBot version ${require('./package.json').version}`);
logger.logPlain("\\/\\/\\/---------------\\/\\/\\/\n");

if(!('CLIENT_TOKEN' in process.env)){
	logger.logError("Environment variable \"CLIENT_TOKEN\" must be set (temporarily) to be able to log in.");
	return;
}

if(!('APERTABOT_DATABASE_DIR' in process.env)){
	logger.logWarn("Environment variable \"APERTABOT_DATABASE_DIR\" not set, defaulting to \"./Databases\"");
	process.env.APERTABOT_DATABASE_DIR = "./Databases";
}

const Discord = require('discord.js');
const client = new Discord.Client();

const commandHandler = require('./core/commands.js');
const storageHandler = require('./core/storage.js');
const voiceHandler = require('./core/voice.js');
const interact = require('./core/interact.js');
const events = require('./core/event.js');

let fullyReady = false;

/**
 * Quick little helper function to connect quotes together
 * @param {Array<string>} args
 */
function connectQuotes (args) {
	var tempArgs = [];
	var tempString = "";
	var inline = false;
	var type = null;
	args.forEach(arg => {
		if(!inline) {
			if(arg.indexOf('"') != arg.lastIndexOf('"') || arg.indexOf("'") != arg.lastIndexOf("'")) {
				tempArgs.push(arg);
			} else if(arg.includes('"')) {
				type = '"';
				inline = true;
				tempString += arg + ' ';
			} else if (arg.includes("'")) {
				type = "'";
				inline = true;
				tempString += arg + ' ';
			} else {
				tempArgs.push(arg);
			}
		} else {
			if(arg.includes(type)) {
				tempString += arg;
				inline = false;
				type = null;
				tempArgs.push(tempString);
				tempString = "";
			} else {
				tempString += arg + ' ';
			}
		}
	});
	return tempArgs;
}

// Once logged in, handle initialization of other things
client.on('ready', async () => {
	logger.logInfo("Connected and ready with Discord, initializing modules...");

	// Initialize modules
	await storageHandler.initialize(client);
	commandHandler.initialize(storageHandler, client);
	voiceHandler.initialize(client);
	interact.initialize();
	events.initialize(client, storageHandler);

	// Start timers
	setInterval(update, require('./config.json').updateTime * 1000);

	// Mark the bot as ready to go!
	fullyReady = true;
	logger.logInfo("Bot is now fully initialized and ready to go!");
});

// Set up the callbacks for logging
client.on('debug', msg => logger.logDebug(msg));
client.on('error', msg => logger.logError(msg));
client.on('warn', msg => logger.logWarn(msg));

// Exit when disconnected
client.on('disconnect', event => {
	logger.logWarn(`Disconnected from Discord. CloseEvent code: ${event.code}. Reason: ${event.reason}`);
});

// Update things such as reminders, etc.
function update(){

}

// Message handler
client.on('message', msg => {
	if(!fullyReady)
		return;

	// If message came from bot, ignore
	if(msg.author.bot)
		return;

	// If message did not come from a guild, ignore and send message
	if(!msg.guild){
		msg.author.send("Sorry, but I only accept messages from servers!");
		return;
	}

	// Confirm the guild has initialized.
	storageHandler.initGuild(msg.guild).then(() => {
		storageHandler.findInGuild(msg.guild.id, "prefix").then(prefix => {
			if(!prefix){
				prefix = `<@${client.user.id}>`;
			}

			// If message does not start with prefix, ignore
			if(!msg.content.startsWith(prefix))
				return;

			// Assign custom values to the message object, for use in the command module
			msg.prefix = prefix;

			// Split message by the spaces into arguments
			var args = msg.content.split(" ");

			// If prefix is a ping
			if(prefix == `<@${client.user.id}>`)
				args.splice(0, 1);

			// Grab function name without the prefix
			var name = args[0].replace(prefix, "");

			// Finally remove the name of the command
			args.splice(0, 1);

			// Connects quotes together, if there are any.
			args = connectQuotes(args);

			logger.logDebug(`User: ${msg.author.tag}. Args: ${args}. Name: ${name}`);

			// Finally, process the command
			commandHandler.processCommand(msg, name, args);
		});
	});
});

client.on('guildCreate', guild => {
	if(!fullyReady)
		return;
	storageHandler.initGuild(guild);
});

client.on('guildDelete', guild => {
	if(!fullyReady)
		return;
	storageHandler.removeGuild(guild.id);
});

process.on('uncaughtException', err => {
	logger.logError(`Uncaught exception: ${err.stack}`);
});

function sleep (time) {
  return new Promise((resolve) => setTimeout(resolve, time));
}

// Clean up upon exiting the program
var hasCleanedUp = false;
async function exitHandler(exit){
	if (hasCleanedUp)
		return;
	try {
		hasCleanedUp = true;
		logger.logInfo("Cleaning up and logging out.");
		await client.destroy();
		logger.logInfo("Sleeping for 3 seconds...");
		await sleep(3000);
	} catch(e){
		logger.logError(e);
		process.exit(1);
		return;
	}
	if (exit)
		process.exit(0);
}
process.on('exit', () => exitHandler(true));
process.on('SIGINT', () => exitHandler(true));
process.on('SIGUSR1', () => exitHandler(true));
process.on('SIGUSR2', () => exitHandler(true));

// Log in (uses environment variable CLIENT_TOKEN internally in Discord.js)
client.login();
