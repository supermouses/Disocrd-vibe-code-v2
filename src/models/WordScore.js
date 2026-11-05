const { Schema, model } = require('mongoose');

const wordScoreSchema = new Schema({
  guildId: { type: String, required: true },
  userId: { type: String, required: true },
  lang: { type: String, enum: ['en', 'vi'], required: true },
  points: { type: Number, default: 0 },
  words: { type: Number, default: 0 },
  bonuses: { type: Number, default: 0 },
});

wordScoreSchema.index({ guildId: 1, userId: 1, lang: 1 }, { unique: true });

module.exports = model('WordScore', wordScoreSchema);
