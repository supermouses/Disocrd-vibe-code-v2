const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const path = require('node:path');
const Song = require('../models/Song');
const { saveFromUrl } = require('../utils/storage');

const ALLOWED_EXT = ['.mp3', '.ogg', '.wav', '.flac', '.m4a', '.opus', '.webm'];
const MAX_FILE_MB = 25;
const MAX_SONGS_PER_GUILD = 100;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('addsong')
    .setDescription('Tải một file nhạc lên thư viện của server (lưu trong MongoDB)')
    .setContexts(0)
    .addAttachmentOption((o) =>
      o.setName('file').setDescription('File nhạc (mp3, ogg, wav, flac, m4a...)').setRequired(true)
    )
    .addStringOption((o) =>
      o.setName('title').setDescription('Tên bài hát (mặc định là tên file)').setMaxLength(100)
    ),
  async execute(interaction) {
    const file = interaction.options.getAttachment('file');
    const ext = path.extname(file.name).toLowerCase();
    const reject = (content) =>
      interaction.reply({ content, flags: MessageFlags.Ephemeral });

    if (!ALLOWED_EXT.includes(ext) && !file.contentType?.startsWith('audio/')) {
      return reject(`File phải là âm thanh (${ALLOWED_EXT.join(', ')}).`);
    }
    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      return reject(`File quá lớn, tối đa ${MAX_FILE_MB}MB.`);
    }
    const count = await Song.countDocuments({ guildId: interaction.guildId });
    if (count >= MAX_SONGS_PER_GUILD) {
      return reject(`Thư viện đã đạt giới hạn ${MAX_SONGS_PER_GUILD} bài. Hãy xóa bớt bằng /removesong.`);
    }

    await interaction.deferReply();

    const title = interaction.options.getString('title') ?? path.basename(file.name, ext);
    const fileId = await saveFromUrl(file.url, file.name, file.contentType ?? 'application/octet-stream');

    await Song.create({
      guildId: interaction.guildId,
      title: title.slice(0, 100),
      filename: file.name,
      contentType: file.contentType ?? 'application/octet-stream',
      size: file.size,
      fileId,
      uploaderId: interaction.user.id,
    });

    await interaction.editReply(`✅ Đã thêm **${title}** vào thư viện. Dùng \`/play\` để phát.`);
  },
};
