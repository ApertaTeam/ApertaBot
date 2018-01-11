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
	databasesRAW: {
		guildDb: databases.guildDb.getAllData()[0],		
	},
	findInGuild: (guild, element) => {
		//var returnVal = {};
		//databases.guildDb.find({ [guild]: { [element]: { $exists: true } } }, function (err, doc) {
			//returnVal = doc;
		//});
		//return returnVal[guild][element];
		return databases.guildDb.getAllData()[0][guild][element];
	},
	addInGuild: (guild, element, value) => {
		databases.guildDb.update({ _id: "guilds" }, { $set: { [guild]: { [element]: value } } }, {}, function (err) {
			if (err) throw err;
		});		
	}
};