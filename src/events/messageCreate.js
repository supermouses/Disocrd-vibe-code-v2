const { Events } = require('discord.js');
const User = require('../models/User');
const { xpForNextLevel } = require('../utils/levels');

const COOLDOWN_MS = 60 * 1000;
const cooldowns = new Map(); // `${guildId}:${userId}` -> timestamp

module.exports = {
  name: Events.MessageCreate,
  async execute(message) {
    if (message.author.bot || !message.guild) return;

    const key = `${message.guild.id}:${message.author.id}`;
    const now = Date.now();
    if (now - (cooldowns.get(key) ?? 0) < COOLDOWN_MS) return;
    cooldowns.set(key, now);

    const gain = Math.floor(Math.random() * 11) + 15; // 15-25 XP

    const user = await User.findOneAndUpdate(
      { guildId: message.guild.id, userId: message.author.id },
      { $inc: { xp: gain } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Lên level
    let leveled = false;
    while (user.xp >= xpForNextLevel(user.level)) {
      user.xp -= xpForNextLevel(user.level);
      user.level += 1;
      leveled = true;
    }

    if (leveled) {
      await user.save();
      message.channel
        .send(`🎉 ${message.author} đã lên **level ${user.level}**!`)
        .catch(() => {});
    }
  },
};
