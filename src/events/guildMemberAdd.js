const { Events } = require('discord.js');
const GuildConfig = require('../models/GuildConfig');

module.exports = {
  name: Events.GuildMemberAdd,
  async execute(member) {
    const config = await GuildConfig.findOne({ guildId: member.guild.id });
    if (!config?.welcomeChannelId) return;

    const channel = member.guild.channels.cache.get(config.welcomeChannelId);
    if (!channel?.isTextBased()) return;

    const text = config.welcomeMessage
      .replaceAll('{user}', `${member}`)
      .replaceAll('{server}', member.guild.name);

    channel.send(text).catch(() => {});
  },
};
