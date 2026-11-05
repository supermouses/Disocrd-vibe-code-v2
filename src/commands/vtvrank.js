const { SlashCommandBuilder } = require('discord.js');
const VuaTVScore = require('../models/VuaTVScore');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('vtvrank')
    .setDescription('Bảng xếp hạng Vua Tiếng Việt')
    .setContexts(0),
  async execute(interaction) {
    const top = await VuaTVScore.find({ guildId: interaction.guildId })
      .sort({ points: -1 })
      .limit(10);

    if (!top.length) {
      return interaction.reply('Chưa có ai ghi điểm. Hãy vào kênh Vua Tiếng Việt và chơi nhé!');
    }

    const medals = ['🥇', '🥈', '🥉'];
    const lines = top.map(
      (u, i) => `${medals[i] ?? `**${i + 1}.**`} <@${u.userId}> — ${u.points} điểm (${u.wins} lần thắng)`
    );
    await interaction.reply({
      content: `👑 **Bảng xếp hạng Vua Tiếng Việt**\n${lines.join('\n')}`,
      allowedMentions: { parse: [] },
    });
  },
};
