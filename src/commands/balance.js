const { SlashCommandBuilder } = require('discord.js');
const User = require('../models/User');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('balance')
    .setDescription('Xem số xu của bạn hoặc người khác')
    .addUserOption((o) => o.setName('user').setDescription('Thành viên cần xem')),
  async execute(interaction) {
    const target = interaction.options.getUser('user') ?? interaction.user;
    const data = await User.findOne({ guildId: interaction.guildId, userId: target.id });
    await interaction.reply(`💰 **${target.username}** có **${data?.coins ?? 0}** xu.`);
  },
};
