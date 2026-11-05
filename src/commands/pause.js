const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { getControlSession } = require('../music/player');

module.exports = {
  data: new SlashCommandBuilder().setName('pause').setDescription('Tạm dừng nhạc').setContexts(0),
  async execute(interaction) {
    const { session, error } = getControlSession(interaction);
    if (error) return interaction.reply({ content: error, flags: MessageFlags.Ephemeral });

    const ok = session.player.pause();
    await interaction.reply(ok ? '⏸️ Đã tạm dừng.' : 'Không có bài nào đang phát.');
  },
};
