const Song = require('../models/Song');

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Gợi ý tên bài hát khi gõ lệnh (autocomplete)
async function songAutocomplete(interaction) {
  const focused = interaction.options.getFocused().trim();
  const filter = { guildId: interaction.guildId };
  if (focused) filter.title = { $regex: escapeRegex(focused), $options: 'i' };

  const songs = await Song.find(filter).sort({ title: 1 }).limit(25);
  await interaction.respond(
    songs.map((s) => ({ name: s.title.slice(0, 100), value: String(s._id) }))
  );
}

// Tìm bài theo _id (từ autocomplete) hoặc theo tên gõ tay
async function findSong(guildId, input) {
  const mongoose = require('mongoose');
  if (mongoose.isValidObjectId(input)) {
    const byId = await Song.findOne({ _id: input, guildId });
    if (byId) return byId;
  }
  return Song.findOne({ guildId, title: { $regex: escapeRegex(input), $options: 'i' } });
}

module.exports = { songAutocomplete, findSong, escapeRegex };
