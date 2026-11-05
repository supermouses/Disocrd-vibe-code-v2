const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { getControlSession } = require('../music/player');

module.exports = {
  data: new SlashCommandBuilder().setName('resume').setDescription('Tiếp tục phát nhạc').setContexts(0),
  async execute(interaction) {
    const { session, error } = getControlSession(interaction);
    if (error) return interaction.reply({ content: error, flags: MessageFlags.Ephemeral });

    const ok = session.player.unpause();
    await interaction.reply(ok ? '▶️ Đã tiếp tục phát.' : 'Nhạc không bị tạm dừng.');
  },
};
