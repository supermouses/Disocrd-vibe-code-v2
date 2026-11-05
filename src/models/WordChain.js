const { Schema, model } = require('mongoose');

const bonusSchema = new Schema(
  {
    proverbId: Schema.Types.ObjectId,
    text: String, // câu có chỗ trống "___"
    answer: String,
    token: String,
    expiresAt: Date,
  },
  { _id: false }
);

// Mỗi kênh chơi nối từ là một document
const wordChainSchema = new Schema(
  {
    guildId: { type: String, required: true, index: true },
    channelId: { type: String, required: true, unique: true },
    lang: { type: String, enum: ['en', 'vi'], required: true },
    currentWord: { type: String, required: true },
    lastUserId: { type: String, default: null },
    usedWords: { type: [String], default: [] },
    chainLength: { type: Number, default: 0 },
    bestChain: { type: Number, default: 0 },
    sinceBonus: { type: Number, default: 0 },
    bonus: { type: bonusSchema, default: null },
  },
  { timestamps: true }
);

module.exports = model('WordChain', wordChainSchema);
