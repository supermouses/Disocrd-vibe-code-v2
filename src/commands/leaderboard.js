const { SlashCommandBuilder } = require('discord.js');
const User = require('../models/User');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('Bảng xếp hạng top 10 của server')
    .addStringOption((o) =>
      o
        .setName('type')
        .setDescription('Xếp theo')
        .addChoices({ name: 'Level', value: 'level' }, { name: 'Xu', value: 'coins' })
    ),
  async execute(interaction) {
    const type = interaction.options.getString('type') ?? 'level';
    const sort = type === 'coins' ? { coins: -1 } : { level: -1, xp: -1 };

    const top = await User.find({ guildId: interaction.guildId }).sort(sort).limit(10);
    if (!top.length) return interaction.reply('Chưa có ai trong bảng xếp hạng.');

    const medals = ['🥇', '🥈', '🥉'];
    const lines = top.map((u, i) => {
      const value = type === 'coins' ? `${u.coins} xu` : `Level ${u.level} (${u.xp} XP)`;
      return `${medals[i] ?? `**${i + 1}.**`} <@${u.userId}> — ${value}`;
    });

    await interaction.reply({
      content: `🏆 **Top ${type === 'coins' ? 'xu' : 'level'}**\n${lines.join('\n')}`,
      allowedMentions: { parse: [] },
    });
  },
};
