const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const Warn = require('../models/Warn');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Cảnh cáo một thành viên')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .setContexts(0) // chỉ dùng trong server
    .addUserOption((o) => o.setName('user').setDescription('Thành viên').setRequired(true))
    .addStringOption((o) => o.setName('reason').setDescription('Lý do')),
  async execute(interaction) {
    const target = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason') ?? 'Không có lý do';

    if (target.bot) {
      return interaction.reply({ content: 'Không thể cảnh cáo bot.', flags: MessageFlags.Ephemeral });
    }

    await Warn.create({
      guildId: interaction.guildId,
      userId: target.id,
      moderatorId: interaction.user.id,
      reason,
    });
    const total = await Warn.countDocuments({ guildId: interaction.guildId, userId: target.id });

    await interaction.reply(
      `⚠️ ${target} đã bị cảnh cáo bởi ${interaction.user}.\nLý do: ${reason}\nTổng số cảnh cáo: **${total}**`
    );
  },
};
