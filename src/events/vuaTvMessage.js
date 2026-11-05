const { Events } = require('discord.js');
const vuatv = require('../vuatv/service');

module.exports = {
  name: Events.MessageCreate,
  async execute(message) {
    if (message.author.bot || !message.guild) return;
    if (!vuatv.isActive(message.channelId)) return;
    if (message.content.startsWith('//')) return; // tin nhắn trò chuyện thường
    await vuatv.handleMessage(message);
  },
};
