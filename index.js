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
	logger.logWarn("Environment variable \"APERTABOT_DATABASE_DIR\" not set, defaulting to \"./Databases\"");
	process.env.APERTABOT_DATABASE_DIR = "./Databases";
}

const Discord = require('discord.js');
const client = new Discord.Client();

const commandHandler = require('./core/commands.js');

let guildData;

const storageHandler = require('./core/storage.js');

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
			} else if(arg.startsWith('"')) {
				type = '"';
				inline = true;
				tempString += arg + ' ';
			} else if (arg.startsWith("'")) {
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
client.on('ready', () => {
	logger.logInfo("Bot is now ready and logged in.");
	storageHandler.initialize(client);
	commandHandler.initialize(storageHandler);
	guildData = storageHandler.databases.guildDb.getAllData()[0];	
});

// Set up the callbacks for logging
client.on('debug', msg => logger.logDebug(msg));
client.on('error', msg => logger.logError(msg));
client.on('warn', msg => logger.logWarn(msg));

// Exit when disconnected
client.on('disconnect', event => {
	logger.logWarn(`Disconnected from Discord. CloseEvent code: ${event.code}. Reason: ${event.reason}`);
});

// Message handler
client.on('message', msg => {
	// If message did not come from a guild, ignore
	if(!msg.guild)
		return;

	// If message came from bot, ignore
	if(msg.author.bot) 
		return;

	guildData = storageHandler.databases.guildDb.getAllData()[0];

	// If guild isn't in the database, update it
	if (!guildData[msg.guild.id]) {
		// Add the prefix element to the database under the guild id, thus adding the guild to the database
		storageHandler.addInGuild(msg.guild.id, 'prefix', 'a!');

		// Since we've updated the database, we need to update the guildData variable
		guildData = storageHandler.databases.guildDb.getAllData()[0];
	}

	
	
	// If prefix for this guild is not defined, make it a bot ping!
	if(guildData == null || guildData[msg.guild.id].prefix == undefined || guildData[msg.guild.id].prefix == null || guildData[msg.guild.id].prefix == "")
		guildData[msg.guild.id].prefix = `<@${client.user.id}>`;	

	// If message does not start with prefix, ignore
	if(!msg.content.startsWith(guildData[msg.guild.id].prefix))
		return;

	msg.prefix = guildData[msg.guild.id].prefix;

	// Split message by the spaces into arguments
	var args = msg.content.split(" ");	

	// If prefix is a ping
	if(guildData[msg.guild.id].prefix == `<@${client.user.id}>`)
		args.splice(0, 1);

	// Grab function name without the prefix
	var name = args[0].replace(guildData[msg.guild.id].prefix, "");

	// Finally remove the name of the command
	args.splice(0, 1);

	// Connects quotes together, if there are any.
	args = connectQuotes(args);

	logger.logDebug(`User: ${msg.author.tag}. Args: ${args}. Name: ${name}`);

	// Finally, process the command
	commandHandler.processCommand(msg, name, args);
});

client.on('guildCreate', guild => {
	storageHandler.addInGuild(guild.id, "prefix", "a!");
});

client.on('guildDelete', guild => {
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
