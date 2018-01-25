'use strict';

let storageHandler;
let Discord = require('discord.js');

function memberAdd(member) {
  storageHandler.findInGuild(member.guild.id, "log").then(log => {
		if(log) {
			var logChannel = member.guild.channels.get(log);
			var logEmbed = new Discord.RichEmbed().setAuthor(member.displayName, member.user.displayAvatarURL)
				.setTitle(`Member Add: ${member.user.tag} (${member.id})`).setDescription(`This guild is now holding ${member.guild.members.size} users.`)
				.setTimestamp().setColor(member.guild.me.displayHexColor);
			logChannel.send(logEmbed);
		}
	});
}

function memberRemove(member) {
  storageHandler.findInGuild(member.guild.id, "log").then(log => {
		if(log) {
			var logChannel = member.guild.channels.get(log);
			var logEmbed = new Discord.RichEmbed().setAuthor(member.displayName, member.user.displayAvatarURL)
				.setTitle(`Member Remove: ${member.user.tag} (${member.id})`).setDescription(`This guild is now holding ${member.guild.members.size} users.`)
				.setTimestamp().setColor(member.guild.me.displayHexColor);
			logChannel.send(logEmbed);
		}
	});
}

function messageDelete(message) {
  storageHandler.findInGuild(message.guild.id, "log").then(log => {
		if(log) {
			var dateString = new Date().toUTCString().split(" ");
			var timeString = dateString[4].substring(0, dateString[4].lastIndexOf(":"));
			var logChannel = message.guild.channels.get(log);
			var logEmbed = new Discord.RichEmbed().setAuthor(message.member.displayName, message.author.displayAvatarURL)
				.setTitle(`Message Removed: From ${message.author.tag} (${message.author.id}) in ${message.channel.name}`)
				.setDescription(`\`\`\`yaml\n[${dateString[2]}-${dateString[1]} — ${timeString} UTC] ${Discord.escapeMarkdown(message.content)}\n\`\`\``)
				.setFooter(`ID: ${message.id}`).setTimestamp().setColor(message.guild.me.displayHexColor);
			logChannel.send(logEmbed);
		}
	});
}

function channelCreate(channel) {
  if(channel.type !== "text" && channel.type !== "voice") {
		return;
	}
	storageHandler.findInGuild(channel.guild.id, "log").then(log => {
		if(log) {
			var logChannel = channel.guild.channels.get(log);
			var logEmbed = new Discord.RichEmbed().setAuthor(channel.guild.name, channel.guild.iconURL)
				.setTitle(`Channel Create: ${channel.name}`)
				.setDescription(`This guild now has ${channel.guild.channels.size} channels.`)
				.setFooter(`ID: ${channel.id}`).setTimestamp().setColor(channel.guild.me.displayHexColor);
			logChannel.send(logEmbed);
		}
	});
}

function channelDelete(channel) {
  if(channel.type !== "text" && channel.type !== "voice") {
		return;
	}
	storageHandler.findInGuild(channel.guild.id, "log").then(log => {
		if(log) {
      if(log == channel.id) {
        storageHandler.removeInGuild(channel.guild.id, "log");
        return;
      }
			var logChannel = channel.guild.channels.get(log);
			var logEmbed = new Discord.RichEmbed().setAuthor(channel.guild.name, channel.guild.iconURL)
				.setTitle(`Channel Delete: ${channel.name}`)
				.setDescription(`This guild now has ${channel.guild.channels.size} channels.`)
				.setFooter(`ID: ${channel.id}`).setTimestamp().setColor(channel.guild.me.displayHexColor);
			logChannel.send(logEmbed);
		}
	});
}

function channelUpdate(oldChan, newChan) {
  if(oldChan.type !== "text" && oldChan.type !== "voice") {
		return;
	}
	storageHandler.findInGuild(oldChan.guild.id, "log").then(log => {
		if(log) {
			let change = {
				name: null,
				topic: null
			};
			if(oldChan.name !== newChan.name) {
				change.name = [oldChan.name, newChan.name];
			}
			if(oldChan.type == "text" && oldChan.topic !== newChan.topic) {
				change.topic = [oldChan.topic, newChan.topic];
			}
			if(!change.name && !change.topic) return;
			var logChannel = oldChan.guild.channels.get(log);
			var logEmbed;
			if(change.name) {
				logEmbed = new Discord.RichEmbed().setAuthor(oldChan.guild.name, oldChan.guild.iconURL)
          .setTitle(`Channel Name Updated`)
          .setDescription(`**${change.name[0]}** ⟶ **${change.name[1]}**`)
          .setFooter(`ID: ${oldChan.id}`).setTimestamp().setColor(oldChan.guild.me.displayHexColor);
			} else if(change.topic) {
        if(change.topic[0] > 1000) {
          change.topic[0] = change.topic[0].substr(0, 997) + "...";
        }
        if(change.topic[1] > 1000) {
          change.topic[1] = change.topic[1].substr(0, 977) + "...";
        }
        if(!change.topic[0]) change.topic[0] = "Nothing";
        if(!change.topic[1]) change.topic[1] = "Nothing";
        logEmbed = new Discord.RichEmbed().setAuthor(oldChan.guild.name, oldChan.guild.iconURL)
          .setTitle(`Channel Topic Updated`)
          .setDescription(`\`\`\`yaml\n${change.topic[0]}\n\`\`\`\n↓\n\`\`\`yaml\n${change.topic[1]}\n\`\`\``)
          .setFooter(`ID: ${oldChan.id}`).setTimestamp().setColor(oldChan.guild.me.displayHexColor);
			}
      logChannel.send(logEmbed);
		}
	});
}

function guildUpdate(oldGuild, newGuild) {
  storageHandler.findInGuild(oldGuild.id, "log").then(log => {
    if(log) {
      let changeType = null;
      if(oldGuild.name !== newGuild.name) {
        changeType = "Name";
      } else if(oldGuild.verificationLevel !== newGuild.verificationLevel) {
        changeType = "Verification";
      } else if(oldGuild.region !== newGuild.region) {
        changeType = "Region";
      } else if(oldGuild.icon !== newGuild.icon) {
        changeType = "Icon";
      }
      if(!changeType) return;

      let verificationLevel = {
        0: "None",
        1: "Low",
        2: "Medium",
        3: "(╯°□°）╯︵ ┻━┻",
        4: "┻━┻ ﾐヽ(ಠ益ಠ)ノ彡┻━┻"
      };

      var logChannel = oldGuild.channels.get(log);
      var logEmbed = new Discord.RichEmbed().setAuthor(newGuild.name, newGuild.iconURL).setTitle(`Guild ${changeType} Updated`);
      switch(changeType) {
        case "Name":
          logEmbed.setDescription(`**${oldGuild.name}** ⟶ **${newGuild.name}**`);
          break;
        case "Verification":
          logEmbed.setDescription(`${verificationLevel[oldGuild.verificationLevel]} ⟶ ${verificationLevel[newGuild.verificationLevel]}`);
          break;
        case "Region":
          logEmbed.setDescription(`**${oldGuild.region}** ⟶ **${newGuild.region}**`);
          break;
        case "Icon":
          logEmbed.setDescription(`${oldGuild.iconURL} ⟶ ${newGuild.iconURL}`);
          break;
      }
      logEmbed.setFooter(`ID: ${newGuild.id}`).setTimestamp().setColor(newGuild.me.displayHexColor);
      logChannel.send(logEmbed);
    }
  });
}
// TODO: Add more log events

module.exports = {
  initialize: (client, storage) => {
    storageHandler = storage;
    client.on('guildMemberAdd', memberAdd);
    client.on('guildMemberRemove', memberRemove);
    client.on('messageDelete', messageDelete);
    client.on('channelCreate', channelCreate);
    client.on('channelDelete', channelDelete);
    client.on('channelUpdate', channelUpdate);
    client.on('guildUpdate', guildUpdate);
  }
}
