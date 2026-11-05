const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { getControlSession, destroySession } = require('../music/player');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('stop')
    .setDescription('Dừng nhạc, xóa hàng đợi và rời kênh thoại')
    .setContexts(0),
  async execute(interaction) {
    const { session, error } = getControlSession(interaction);
    if (error) return interaction.reply({ content: error, flags: MessageFlags.Ephemeral });

    destroySession(session.guildId);
    await interaction.reply('⏹️ Đã dừng nhạc và rời kênh thoại.');
  },
};
