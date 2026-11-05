const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
  MessageFlags,
} = require('discord.js');
const wordchain = require('../wordchain/service');

const NEEDED = [
  PermissionFlagsBits.ViewChannel,
  PermissionFlagsBits.SendMessages,
  PermissionFlagsBits.AddReactions,
  PermissionFlagsBits.ReadMessageHistory,
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('wordchain')
    .setDescription('Quản lý trò chơi nối từ (dành cho admin)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setContexts(0)
    .addSubcommand((s) =>
      s
        .setName('setup')
        .setDescription('Bật trò nối từ cho một kênh')
        .addChannelOption((o) =>
          o
            .setName('channel')
            .setDescription('Kênh chơi')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
        .addStringOption((o) =>
          o
            .setName('language')
            .setDescription('Ngôn ngữ của kênh')
            .setRequired(true)
            .addChoices({ name: 'Tiếng Việt', value: 'vi' }, { name: 'English', value: 'en' })
        )
    )
    .addSubcommand((s) =>
      s
        .setName('stop')
        .setDescription('Tắt trò nối từ ở một kênh')
        .addChannelOption((o) =>
          o
            .setName('channel')
            .setDescription('Kênh (mặc định là kênh hiện tại)')
            .addChannelTypes(ChannelType.GuildText)
        )
    )
    .addSubcommand((s) =>
      s.setName('reset').setDescription('Bắt đầu lại chuỗi nối từ ở kênh hiện tại với từ mới')
    ),
  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const ephemeral = { flags: MessageFlags.Ephemeral };

    if (sub === 'setup') {
      const channel = interaction.options.getChannel('channel');
      const lang = interaction.options.getString('language');

      if (require('../vuatv/service').isActive(channel.id)) {
        return interaction.reply({
          content: `${channel} đang chơi Vua Tiếng Việt. Hãy chọn kênh khác hoặc tắt trò đó trước.`,
          ...ephemeral,
        });
      }

      const perms = channel.permissionsFor(interaction.guild.members.me);
      if (!perms?.has(NEEDED)) {
        return interaction.reply({
          content: `Bot cần quyền xem kênh, gửi tin nhắn, thêm reaction và đọc lịch sử tin nhắn trong ${channel}.`,
          ...ephemeral,
        });
      }

      await interaction.deferReply(ephemeral);
      await wordchain.startGame(channel, lang);
      return interaction.editReply(
        `✅ Đã bật nối từ **${lang === 'vi' ? 'Tiếng Việt' : 'English'}** ở ${channel}.`
      );
    }

    if (sub === 'stop') {
      const channel = interaction.options.getChannel('channel') ?? interaction.channel;
      const ok = await wordchain.stopGame(channel.id);
      return interaction.reply({
        content: ok ? `⏹️ Đã tắt nối từ ở ${channel}.` : 'Kênh này chưa bật nối từ.',
        ...ephemeral,
      });
    }

    // reset
    await interaction.deferReply(ephemeral);
    const ok = await wordchain.restartGame(interaction.channel);
    await interaction.editReply(ok ? '🔄 Đã bắt đầu lại chuỗi nối từ.' : 'Kênh này chưa bật nối từ.');
  },
};
