'use strict';

const logger = require('./logger.js');
const Datastore = require('nedb');

var datadir = process.env.APERTABOT_DATABASE_DIR;
if(datadir.endsWith("/"))
	datadir = datadir.slice(0, -1);
logger.logDebug(`Database directory: ${datadir}`);

var databases = {
	guilds: new Datastore({
			filename: datadir + "/guilds.db",
			autoload: true })
};

function init_guild(guild){
	return new Promise(resolve => {
		databases.guilds.count({ id: guild.id }, (err, count) => {
			if (err) throw err;
			if (count == 0){
				// Give default values, insert it.
				databases.guilds.insert({ id: guild.id, prefix: "a!" }, err2 => {
					if(err2) throw err2;
					resolve();
				});
			} else {
				resolve();
			}
		});
	});
}

module.exports = {
	databases: databases,
	/**
	 * Initialize the storage module
	 * @param {Discord.Client} client - The currently initialized discord client. (In the ready state)
	 */
	initialize: client => {
		return new Promise(resolve => {
			logger.logInfo("Initializing storage module");

			// If there are no guilds, prevent the whole thing from freezing up.
			if(client.guilds.size == 0){
				resolve();
				return;
			}

			// Loop through each guild, and if it doesn't exist in the database, insert it.
			var i = 0;
			client.guilds.forEach(guild => {
				init_guild(guild).then(() => {
					i++;
					if(i >= client.guilds.size){
						resolve();
					}
				});
			});
		});
	},
	/**
	 * Initialize a new guild
	 * @param {Discord.Guild} guild
	 */
	initGuild: guild => {
		return new Promise(resolve => {
			init_guild(guild).then(() => {
				resolve();
			});
		});
	},
	/**
	 * Find an element in the specified guild.
	 * @param {string} guildId - The id of the guild to access
	 * @param {string} element - The element to find in the guild, e.g. "prefix"
	 */
	findInGuild: (guildId, element) => {
		return new Promise(resolve => {
			databases.guilds.findOne({ id: guildId }, (err, doc) => {
				if (err) throw err;
				resolve(doc[element]);
			});
		});
	},
	/**
	 * Add a value to an element in the specified guild.
	 * @param {string} guildId - The id of the guild to access
	 * @param {string} element - The element to change in the guild, e.g. "prefix"
	 * @param {any} value - The value to set
	 */
	addInGuild: (guildId, element, value) => {
		return new Promise(resolve => {
			databases.guilds.update({ id: guildId }, { $set: { [element]: value } }, {}, err => {
				if (err) throw err;
				resolve();
			});
		});
	},
	/**
	 * Remove a specified guild from the database
	 * @param {string} guildId - The id of the guild to remove.
	 */
	removeGuild: guildId => {
		return new Promise(resolve => {
			databases.guilds.remove({ id: guildId }, {}, err => {
				if (err) throw err;
				resolve();
			});
		});
	},
	/**
	 * Remove a specified element from a guild
	 * @param {string} guildId - The id of the guild to modify.
	 * @param {string} element - The element to remove, e.g. "log"
	*/
	removeInGuild: (guildId, element) => {
		return new Promise(resolve => {
			databases.guilds.update({ id: guildId }, { $unset: { [element]: true }}, {}, (err) => {
				if (err) throw err;
				resolve();
			});
		});
	}
};
