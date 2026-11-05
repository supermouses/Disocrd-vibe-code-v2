const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
  MessageFlags,
} = require('discord.js');
const GuildConfig = require('../models/GuildConfig');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setwelcome')
    .setDescription('Cài đặt kênh và tin nhắn chào mừng thành viên mới')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setContexts(0)
    .addChannelOption((o) =>
      o
        .setName('channel')
        .setDescription('Kênh gửi tin chào mừng')
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
        .setRequired(true)
    )
    .addStringOption((o) =>
      o.setName('message').setDescription('Nội dung. Dùng {user} và {server}')
    ),
  async execute(interaction) {
    const channel = interaction.options.getChannel('channel');
    const message = interaction.options.getString('message');

    const update = { welcomeChannelId: channel.id };
    if (message) update.welcomeMessage = message;

    await GuildConfig.findOneAndUpdate({ guildId: interaction.guildId }, update, {
      upsert: true,
      setDefaultsOnInsert: true,
    });

    await interaction.reply({
      content: `✅ Đã đặt kênh chào mừng là ${channel}.`,
      flags: MessageFlags.Ephemeral,
    });
  },
};
