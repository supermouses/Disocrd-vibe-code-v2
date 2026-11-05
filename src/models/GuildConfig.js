const { Schema, model } = require('mongoose');

const guildConfigSchema = new Schema({
  guildId: { type: String, required: true, unique: true },
  welcomeChannelId: { type: String, default: null },
  welcomeMessage: {
    type: String,
    default: 'Chào mừng {user} đến với **{server}**! 🎉',
  },
});

module.exports = model('GuildConfig', guildConfigSchema);
