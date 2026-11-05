const { Schema, model } = require('mongoose');

const userSchema = new Schema(
  {
    guildId: { type: String, required: true },
    userId: { type: String, required: true },
    xp: { type: Number, default: 0 },
    level: { type: Number, default: 0 },
    coins: { type: Number, default: 0 },
    lastDaily: { type: Date, default: null },
  },
  { timestamps: true }
);

userSchema.index({ guildId: 1, userId: 1 }, { unique: true });

module.exports = model('User', userSchema);
