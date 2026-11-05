const { SlashCommandBuilder } = require('discord.js');
const User = require('../models/User');

const DAILY_REWARD = 100;
const DAY_MS = 24 * 60 * 60 * 1000;

module.exports = {
  data: new SlashCommandBuilder().setName('daily').setDescription('Điểm danh nhận xu mỗi ngày'),
  async execute(interaction) {
    const filter = { guildId: interaction.guildId, userId: interaction.user.id };
    let user = await User.findOne(filter);
    if (!user) user = await User.create(filter);

    const now = Date.now();
    if (user.lastDaily && now - user.lastDaily.getTime() < DAY_MS) {
      const next = Math.floor((user.lastDaily.getTime() + DAY_MS) / 1000);
      return interaction.reply(`⏳ Bạn đã điểm danh rồi. Quay lại <t:${next}:R> nhé!`);
    }

    user.coins += DAILY_REWARD;
    user.lastDaily = new Date(now);
    await user.save();

    await interaction.reply(
      `✅ Bạn nhận được **${DAILY_REWARD}** xu! Số dư hiện tại: **${user.coins}** xu.`
    );
  },
};
