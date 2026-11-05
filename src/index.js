require('dotenv').config();
const fs = require('node:fs');
const path = require('node:path');
const mongoose = require('mongoose');
const { Client, Collection, GatewayIntentBits } = require('discord.js');

const { DISCORD_TOKEN, MONGODB_URI } = process.env;

if (!DISCORD_TOKEN || !MONGODB_URI) {
  console.error('Thiếu DISCORD_TOKEN hoặc MONGODB_URI trong file .env');
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers, // cần bật "Server Members Intent" trong Developer Portal
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildVoiceStates, // cần để phát nhạc trong kênh thoại
    GatewayIntentBits.MessageContent, // cần để đọc từ người chơi nối từ (bật "Message Content Intent" trong Developer Portal)
  ],
});

// Nạp lệnh
client.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');
for (const file of fs.readdirSync(commandsPath).filter((f) => f.endsWith('.js'))) {
  const command = require(path.join(commandsPath, file));
  client.commands.set(command.data.name, command);
}

// Nạp sự kiện
const eventsPath = path.join(__dirname, 'events');
for (const file of fs.readdirSync(eventsPath).filter((f) => f.endsWith('.js'))) {
  const event = require(path.join(eventsPath, file));
  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args));
  } else {
    client.on(event.name, (...args) => event.execute(...args));
  }
}

(async () => {
  await mongoose.connect(MONGODB_URI);
  console.log('Đã kết nối MongoDB');
  await client.login(DISCORD_TOKEN);
})().catch((err) => {
  console.error('Khởi động thất bại:', err);
  process.exit(1);
});
