const { Events } = require('discord.js');
const wordchain = require('../wordchain/service');

module.exports = {
  name: Events.MessageCreate,
  async execute(message) {
    if (message.author.bot || !message.guild) return;
    if (!wordchain.isActive(message.channelId)) return;
    if (message.content.startsWith('//')) return; // tin nhắn trò chuyện thường
    await wordchain.handleMessage(message);
  },
};
