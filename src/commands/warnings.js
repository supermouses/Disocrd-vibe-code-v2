const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const Warn = require('../models/Warn');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warnings')
    .setDescription('Xem danh sách cảnh cáo của một thành viên')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .setContexts(0)
    .addUserOption((o) => o.setName('user').setDescription('Thành viên').setRequired(true)),
  async execute(interaction) {
    const target = interaction.options.getUser('user');
    const warns = await Warn.find({ guildId: interaction.guildId, userId: target.id })
      .sort({ createdAt: -1 })
      .limit(10);

    if (!warns.length) return interaction.reply(`${target.username} chưa có cảnh cáo nào.`);

    const lines = warns.map(
      (w, i) =>
        `**${i + 1}.** ${w.reason} — bởi <@${w.moderatorId}> (<t:${Math.floor(w.createdAt.getTime() / 1000)}:d>)`
    );
    await interaction.reply({
      content: `📋 Cảnh cáo của **${target.username}** (10 gần nhất):\n${lines.join('\n')}`,
      allowedMentions: { parse: [] },
    });
  },
};
