'use strict';

const logger = require('./logger.js');
const Datastore = require('nedb');

var datadir = process.env.APERTABOT_DATABASE_DIR;
if(datadir.endsWith("/"))
	datadir = datadir.slice(0, -1);
console.log(datadir);

var databases = { 
	guildDb: new Datastore({ 
			filename: datadir + "/guilds.db", 
			autoload: true })
};

module.exports = {
	databases: databases,
	/**
	 * This was a mistake, much like my life :)
	 * @param {Discord.Client} client - The currently initialized discord client. (In the ready state :3)
	 */
	initialize: client => {
		var doc = databases.guildDb.getAllData()[0];
		if (!doc) {
			var newDoc = { _id: 'guilds' };
			client.guilds.forEach(guild => {
				newDoc[guild.id] = {
					prefix: 'a!'
				};
			});
			databases.guildDb.insert(newDoc, err => {if (err) throw err;});
		}
	},
	/**
	 * Returns the database as a javascript object
	 * @returns {JSON}
	 */
	databasesRAW: {
		guildDb: databases.guildDb.getAllData()[0],		
	},
	/**
	 * Find an element in the specified guild.
	 * @param {string} guild - The id of the guild to access
	 * @param {string} element - The element to find in the guild, e.g. "prefix"
	 */
	findInGuild: (guild, element) => {
		return databases.guildDb.getAllData()[0][guild][element];
	},
	/**
	 * Add a value to an element in the specified guild.
	 * @param {string} guild - The id of the guild to access
	 * @param {string} element - The element to change in the guild, e.g. "prefix"
	 * @param {any} value - The value to set
	 */
	addInGuild: (guild, element, value) => {
		databases.guildDb.update({ _id: "guilds" }, { $set: { [guild]: { [element]: value } } }, {}, function (err) {
			if (err) throw err;
		});		
	},
	/**
	 * Remove a specified guild from the database
	 * @param {string} guild - The id of the guild to remove.
	 */
	removeGuild: function (guild) {
		databases.guildDb.remove({ [guild]: { $exists: true } }, {}, err => {
			if (err) throw err;
		});
	}
};