const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
  MessageFlags,
} = require('discord.js');
const vuatv = require('../vuatv/service');
const wordchain = require('../wordchain/service');

const NEEDED = [
  PermissionFlagsBits.ViewChannel,
  PermissionFlagsBits.SendMessages,
  PermissionFlagsBits.AddReactions,
  PermissionFlagsBits.ReadMessageHistory,
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('vuatv')
    .setDescription('Quản lý trò Vua Tiếng Việt (dành cho admin)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setContexts(0)
    .addSubcommand((s) =>
      s
        .setName('setup')
        .setDescription('Bật Vua Tiếng Việt cho một kênh')
        .addChannelOption((o) =>
          o
            .setName('channel')
            .setDescription('Kênh chơi')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
        .addIntegerOption((o) =>
          o
            .setName('seconds')
            .setDescription('Thời gian mỗi vòng (giây, mặc định 60)')
            .setMinValue(30)
            .setMaxValue(180)
        )
    )
    .addSubcommand((s) =>
      s
        .setName('stop')
        .setDescription('Tắt Vua Tiếng Việt ở một kênh')
        .addChannelOption((o) =>
          o
            .setName('channel')
            .setDescription('Kênh (mặc định là kênh hiện tại)')
            .addChannelTypes(ChannelType.GuildText)
        )
    )
    .addSubcommand((s) => s.setName('skip').setDescription('Bỏ qua vòng hiện tại và công bố đáp án')),
  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const ephemeral = { flags: MessageFlags.Ephemeral };

    if (sub === 'setup') {
      const channel = interaction.options.getChannel('channel');
      const seconds = interaction.options.getInteger('seconds') ?? 60;

      if (wordchain.isActive(channel.id)) {
        return interaction.reply({
          content: `${channel} đang chơi nối từ. Hãy chọn kênh khác hoặc tắt nối từ trước.`,
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
      await vuatv.startGame(channel, seconds);
      return interaction.editReply(`✅ Đã bật Vua Tiếng Việt ở ${channel} (${seconds} giây/vòng).`);
    }

    if (sub === 'stop') {
      const channel = interaction.options.getChannel('channel') ?? interaction.channel;
      const ok = await vuatv.stopGame(channel.id);
      return interaction.reply({
        content: ok ? `⏹️ Đã tắt Vua Tiếng Việt ở ${channel}.` : 'Kênh này chưa bật Vua Tiếng Việt.',
        ...ephemeral,
      });
    }

    // skip
    await interaction.deferReply(ephemeral);
    const ok = await vuatv.skipRound(interaction.channel);
    await interaction.editReply(ok ? '⏭️ Đã bỏ qua vòng hiện tại.' : 'Hiện không có vòng nào đang diễn ra ở kênh này.');
  },
};
