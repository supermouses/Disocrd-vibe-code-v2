const { SlashCommandBuilder } = require('discord.js');
const { sessions } = require('../music/player');

module.exports = {
  data: new SlashCommandBuilder().setName('queue').setDescription('Xem hàng đợi phát nhạc').setContexts(0),
  async execute(interaction) {
    const s = sessions.get(interaction.guildId);
    if (!s || (!s.current && !s.queue.length)) {
      return interaction.reply('Hàng đợi đang trống.');
    }

    const lines = [];
    if (s.current) lines.push(`▶️ **Đang phát:** ${s.current.title}`);
    s.queue.slice(0, 10).forEach((song, i) => lines.push(`**${i + 1}.** ${song.title}`));
    if (s.queue.length > 10) lines.push(`…và ${s.queue.length - 10} bài nữa`);

    await interaction.reply(lines.join('\n'));
  },
};
