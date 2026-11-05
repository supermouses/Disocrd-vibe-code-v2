const { Schema, model } = require('mongoose');

// Từ điển của trò nối từ: từ nạp sẵn + từ được duyệt/nối thành công
const wordSchema = new Schema(
  {
    lang: { type: String, enum: ['en', 'vi'], required: true },
    word: { type: String, required: true },
    source: { type: String, default: 'api' }, // seed | api | vote | proverb
    timesUsed: { type: Number, default: 0 },
  },
  { timestamps: true }
);

wordSchema.index({ lang: 1, word: 1 }, { unique: true });

module.exports = model('Word', wordSchema);
