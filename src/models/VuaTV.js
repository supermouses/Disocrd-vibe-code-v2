const { Schema, model } = require('mongoose');

// Mỗi kênh chơi Vua Tiếng Việt là một document, lưu luôn vòng đang diễn ra
const vuaTvSchema = new Schema(
  {
    guildId: { type: String, required: true, index: true },
    channelId: { type: String, required: true, unique: true },
    roundSeconds: { type: Number, default: 60 },
    roundNumber: { type: Number, default: 0 },
    answer: { type: String, default: null }, // null = đang nghỉ giữa các vòng
    letters: { type: [String], default: [] },
    token: { type: String, default: null },
    startedAt: { type: Date, default: null },
    endsAt: { type: Date, default: null },
    hintStage: { type: Number, default: 0 },
    recent: { type: [String], default: [] }, // các đáp án gần đây để không lặp lại
  },
  { timestamps: true }
);

module.exports = model('VuaTV', vuaTvSchema);
