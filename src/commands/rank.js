const { SlashCommandBuilder } = require('discord.js');
const User = require('../models/User');
const { xpForNextLevel } = require('../utils/levels');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rank')
    .setDescription('Xem level và XP của bạn hoặc người khác')
    .addUserOption((o) => o.setName('user').setDescription('Thành viên cần xem')),
  async execute(interaction) {
    const target = interaction.options.getUser('user') ?? interaction.user;
    const data = await User.findOne({ guildId: interaction.guildId, userId: target.id });

    if (!data) {
      return interaction.reply(`${target.username} chưa có dữ liệu XP nào.`);
    }

    const higher = await User.countDocuments({
      guildId: interaction.guildId,
      $or: [{ level: { $gt: data.level } }, { level: data.level, xp: { $gt: data.xp } }],
    });

    await interaction.reply(
      `📊 **${target.username}** — Hạng **#${higher + 1}**\n` +
        `Level: **${data.level}** • XP: **${data.xp}/${xpForNextLevel(data.level)}**`
    );
  },
};
