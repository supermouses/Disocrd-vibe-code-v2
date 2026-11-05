const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const Song = require('../models/Song');
const { deleteFile } = require('../utils/storage');
const { songAutocomplete, findSong } = require('../utils/songs');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('removesong')
    .setDescription('Xóa một bài khỏi thư viện')
    .setContexts(0)
    .addStringOption((o) =>
      o.setName('song').setDescription('Bài hát cần xóa').setAutocomplete(true).setRequired(true)
    ),
  autocomplete: songAutocomplete,
  async execute(interaction) {
    const song = await findSong(interaction.guildId, interaction.options.getString('song'));
    if (!song) {
      return interaction.reply({ content: 'Không tìm thấy bài hát.', flags: MessageFlags.Ephemeral });
    }

    const canManage = interaction.memberPermissions.has(PermissionFlagsBits.ManageGuild);
    if (song.uploaderId !== interaction.user.id && !canManage) {
      return interaction.reply({
        content: 'Chỉ người tải lên hoặc người có quyền Manage Server mới xóa được.',
        flags: MessageFlags.Ephemeral,
      });
    }

    await deleteFile(song.fileId).catch(() => {});
    await song.deleteOne();
    await interaction.reply(`🗑️ Đã xóa **${song.title}** khỏi thư viện.`);
  },
};
