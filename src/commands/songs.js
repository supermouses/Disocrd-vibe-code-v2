const { SlashCommandBuilder } = require('discord.js');
const Song = require('../models/Song');

const PAGE_SIZE = 10;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('songs')
    .setDescription('Xem thư viện nhạc của server')
    .setContexts(0)
    .addIntegerOption((o) => o.setName('page').setDescription('Trang').setMinValue(1)),
  async execute(interaction) {
    const total = await Song.countDocuments({ guildId: interaction.guildId });
    if (!total) return interaction.reply('Thư viện trống. Dùng `/addsong` để thêm nhạc.');

    const pages = Math.ceil(total / PAGE_SIZE);
    const page = Math.min(interaction.options.getInteger('page') ?? 1, pages);

    const songs = await Song.find({ guildId: interaction.guildId })
      .sort({ title: 1 })
      .skip((page - 1) * PAGE_SIZE)
      .limit(PAGE_SIZE);

    const lines = songs.map(
      (s, i) =>
        `**${(page - 1) * PAGE_SIZE + i + 1}.** ${s.title} — ${(s.size / 1024 / 1024).toFixed(1)}MB • <@${s.uploaderId}>`
    );

    await interaction.reply({
      content: `🎵 **Thư viện nhạc** (${total} bài) — trang ${page}/${pages}\n${lines.join('\n')}`,
      allowedMentions: { parse: [] },
    });
  },
};
