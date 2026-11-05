const { SlashCommandBuilder } = require('discord.js');
const path = require('node:path');
const { openUrlStream, assertSafeUrl } = require('../utils/urlStream');
const { playItem } = require('../music/player');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('playurl')
    .setDescription('Phát nhạc từ link trực tiếp (file .mp3/.ogg/... hoặc radio stream)')
    .setContexts(0)
    .addStringOption((o) => o.setName('url').setDescription('Link tới file/stream âm thanh').setRequired(true))
    .addStringOption((o) => o.setName('title').setDescription('Tên hiển thị').setMaxLength(100)),
  async execute(interaction) {
    await interaction.deferReply();
    const input = interaction.options.getString('url').trim();

    try {
      // Kiểm tra link sớm để báo lỗi ngay thay vì sau khi bot đã vào kênh thoại
      const url = await assertSafeUrl(input);
      (await openUrlStream(url.href)).destroy();

      const fallback = decodeURIComponent(path.basename(url.pathname)) || url.hostname;
      const title = (interaction.options.getString('title') ?? fallback).slice(0, 100);
      await playItem(interaction, { title, url: url.href });
    } catch (err) {
      await interaction.editReply(`❌ ${err.message}`);
    }
  },
};
