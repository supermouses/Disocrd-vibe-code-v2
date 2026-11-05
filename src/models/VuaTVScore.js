const { Schema, model } = require('mongoose');

const vuaTvScoreSchema = new Schema({
  guildId: { type: String, required: true },
  userId: { type: String, required: true },
  points: { type: Number, default: 0 },
  wins: { type: Number, default: 0 },
});

vuaTvScoreSchema.index({ guildId: 1, userId: 1 }, { unique: true });

module.exports = model('VuaTVScore', vuaTvScoreSchema);
