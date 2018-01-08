'use strict';

var LogLevel = {
	ERROR: 0,
	WARN: 1,
	INFO: 2,
	DEBUG: 3
};

var ll = LogLevel.INFO;

module.exports = {
	setLogLevel: level => {
		if (level in LogLevel){
			ll = level;
		} else {
			switch(level){
				case 0:
					ll = LogLevel.ERROR;
					break;
				case 1:
					ll = LogLevel.WARN;
					break;
				case 2:
					ll = LogLevel.INFO;
					break;
				case 3:
					ll = LogLevel.DEBUG;
					break;
				default:
					console.error("[ERROR] Invalid log level, defaulting to INFO.");
					break;
			}
		}
	},
	logPlain: msg => {
		console.log(msg);
	},
	logInfo: msg => {
		if (ll >= LogLevel.INFO){
			console.log(`[INFO] ${msg}`);
		}
	},
	logDebug: msg => {
		if (ll >= LogLevel.DEBUG){
			console.log(`[DEBUG] ${msg}`);
		}
	},
	logWarn: msg => {
		if (ll >= LogLevel.WARN){
			console.log(`[WARN] ${msg}`);
		}
	},
	logError: msg => {
		if (ll >= LogLevel.ERROR){
			console.error(`[ERROR] ${msg}`);
		}
	}
};