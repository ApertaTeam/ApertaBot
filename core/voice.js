'use strict';

const logger = require('./logger.js');

let dclient, maxChannels, channelCount;

var VoiceFailStatus = {
    UnknownError: 1,
    MaxChannelsInUse: 2,
    NotInChannel: 3
};

let memberConnections;

module.exports = {
    VoiceFailStatus: VoiceFailStatus,
    initialize: client => {
        logger.logInfo("Initializing voice module");

        // Load config.json
        let data = require('../config.json');
		if (!data.maxVoiceChannels){
			throw new Error("Invalid config.json");
        }
        maxChannels = data.maxVoiceChannels;

        // Assign miscellaneous variables
        dclient = client;
        channelCount = 0;
        memberConnections = new Map();

        // Handle when users leave/join channels
        dclient.on('voiceStateUpdate', (oldMember, newMember) => {
            if(memberConnections.has(oldMember.user.id)){
                if(newMember.voiceChannel != memberConnections.get(oldMember.user.id).channel){
                    memberConnections.get(oldMember.user.id).disconnect();
                    oldMember.user.send("Since you left the voice channel I was in with you, I have also left.");
                }
            }
        });
    },
    // Returns either a fail status or a Promise
    joinUserChannel: member => {
        if(channelCount >= maxChannels){
            return VoiceFailStatus.MaxChannelsInUse;
        }
        if(!member.voiceChannel){
            return VoiceFailStatus.NotInChannel;
        }
        return new Promise(resolve => {
            member.voiceChannel.join().then(connection => {
                memberConnections.set(member.user.id, connection);
                connection.on('disconnect', () => {
                    if(memberConnections.has(member.user.id)){
                        memberConnections.delete(member.user.id);
                        if(channelCount > 0)
                            channelCount--;
                    }
                });
                channelCount++;
                resolve(connection);
            });
        });
    },
    playLocalFile: (member, path) => {
        if(!memberConnections.has(member.user.id))
            return undefined;
        let connection = memberConnections.get(member.user.id);
        let dispatcher = connection.playFile(path);
        return dispatcher;
    },
    playArbitrary: (member, input) => {
        if(!memberConnections.has(member.user.id))
            return undefined;
        let connection = memberConnections.get(member.user.id);
        let dispatcher = connection.playArbitraryInput(input);
        return dispatcher;
    },
    disconnect: (member) => {
        if(!memberConnections.has(member.user.id))
            return false;
        let connection = memberConnections.get(member.user.id);
        connection.disconnect();
        return true;
    }
};