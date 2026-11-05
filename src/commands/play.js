const { SlashCommandBuilder } = require('discord.js');
const { songAutocomplete, findSong } = require('../utils/songs');
const { playItem } = require('../music/player');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('play')
    .setDescription('Phát một bài từ thư viện nhạc trong kênh thoại của bạn')
    .setContexts(0)
    .addStringOption((o) =>
      o.setName('song').setDescription('Tên bài hát').setAutocomplete(true).setRequired(true)
    ),
  autocomplete: songAutocomplete,
  async execute(interaction) {
    await interaction.deferReply();

    const song = await findSong(interaction.guildId, interaction.options.getString('song'));
    if (!song) {
      return interaction.editReply('Không tìm thấy bài hát. Xem danh sách bằng `/songs`.');
    }

    await playItem(interaction, { title: song.title, fileId: song.fileId });
  },
};
