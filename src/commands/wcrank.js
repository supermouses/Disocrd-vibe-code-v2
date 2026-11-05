const { SlashCommandBuilder } = require('discord.js');
const WordScore = require('../models/WordScore');
const WordChain = require('../models/WordChain');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('wcrank')
    .setDescription('Bảng xếp hạng và tình trạng trò nối từ')
    .setContexts(0),
  async execute(interaction) {
    const top = await WordScore.aggregate([
      { $match: { guildId: interaction.guildId } },
      {
        $group: {
          _id: '$userId',
          points: { $sum: '$points' },
          words: { $sum: '$words' },
          bonuses: { $sum: '$bonuses' },
        },
      },
      { $sort: { points: -1 } },
      { $limit: 10 },
    ]);

    const parts = [];
    const game = await WordChain.findOne({ channelId: interaction.channelId });
    if (game) {
      parts.push(
        `🎮 Từ hiện tại: **${game.currentWord}** • chuỗi **${game.chainLength}** • kỷ lục **${game.bestChain}**`
      );
    }

    if (!top.length) {
      parts.push('Chưa có ai ghi điểm. Hãy vào kênh nối từ và chơi nhé!');
    } else {
      const medals = ['🥇', '🥈', '🥉'];
      parts.push(
        '🏆 **Bảng xếp hạng nối từ**\n' +
          top
            .map(
              (u, i) =>
                `${medals[i] ?? `**${i + 1}.**`} <@${u._id}> — ${u.points} điểm (${u.words} từ, ${u.bonuses} thưởng)`
            )
            .join('\n')
      );
    }

    await interaction.reply({ content: parts.join('\n\n'), allowedMentions: { parse: [] } });
  },
};
