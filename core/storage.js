'use strict';

const logger = require('logger.js');
const Datastore = require('nedb');

var datadir = process.env.APERTABOT_DATABASE_DIR;
if(datadir.endsWith("/"))
	datadir = datadir.slice(0, -1);

var databases = { 
	guildDb: new Datastore({ 
			filename: datadir + "/guilds.db", 
			autoload: true })
};

module.exports = {

};