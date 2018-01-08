'use strict';

const logger = require("./core/logger.js");
logger.setLogLevel(parseInt(require('./config.json').logLevel));

logger.logPlain("\\/\\/\\/---------------\\/\\/\\/");
logger.logPlain(`ApertaBot version ${require('./package.json').version}`);
logger.logPlain("\\/\\/\\/---------------\\/\\/\\/\n");

if(!('CLIENT_TOKEN' in process.env)){
	logger.logError("Environment variable \"CLIENT_TOKEN\" must be set (temporarily) to be able to log in.");
	return;
}

if(!('APERTABOT_DATABASE_DIR' in process.env)){
	logger.logError("Environment variable \"APERTABOT_DATABASE_DIR\" must be set (temporarily) to be able to operate databases.");
	return;
}

const Discord = require('discord.js');
const client = new Discord.Client();

const commandHandler = require('./core/commands.js');
commandHandler.initialize();

// Temporary prefix
var prefix;

// Once logged in, handle initialization of other things
client.on('ready', () => {
	logger.logInfo("Bot is now ready and logged in.");
	// If prefixed is not defined, make it a ping
	if(prefix == null || prefix == undefined || prefix == "") {
		prefix = `<@${client.user.id}>`;
	}
});

// Set up the callbacks for logging
client.on('debug', msg => logger.logDebug(msg));
client.on('error', msg => logger.logError(msg));
client.on('warn', msg => logger.logWarn(msg));

// Exit when disconnected
client.on('disconnect', event => {
	logger.logError(`Disconnected from Discord. CloseEvent code: ${event.code}. Reason: ${event.reason}`);
});

// Message handler
client.on('message', msg => {
	// If message came from this (or another) bot, ignore
	if(msg.author.bot)
		return;
	if(!msg.content.startsWith(prefix)) return; // If message does not start with prefix, ignore
	var args = msg.content.match(/[^"\s]+|"(?:\\"|[^"])+"/g); // Split message by the spaces into arguments, keeping anything in quotes connected
	
	var finalargs = args.slice();
	var name;
	// If prefix is normal string
	if(prefix != `<@${client.user.id}>`){
		name = args[0].substr(prefix.length); // Grab the name without the prefix
		finalargs.splice(0, 1);
	} else { // If prefix is a ping
		name = args[1]; // Grab the name from the second argument
		finalargs.splice(0, 2);
	}

	logger.logDebug(`Args: ${args}. Name: ${name}`);
	commandHandler.processCommand(msg, name, finalargs); // Process command
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