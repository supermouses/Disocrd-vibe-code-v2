require('dotenv').config();
const fs = require('node:fs');
const path = require('node:path');
const { REST, Routes } = require('discord.js');

const { DISCORD_TOKEN, CLIENT_ID, GUILD_ID } = process.env;

const commands = [];
const commandsPath = path.join(__dirname, 'commands');
for (const file of fs.readdirSync(commandsPath).filter((f) => f.endsWith('.js'))) {
  commands.push(require(path.join(commandsPath, file)).data.toJSON());
}

const rest = new REST().setToken(DISCORD_TOKEN);

(async () => {
  const route = GUILD_ID
    ? Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID)
    : Routes.applicationCommands(CLIENT_ID);
  const data = await rest.put(route, { body: commands });
  console.log(
    `Đã đăng ký ${data.length} lệnh ${GUILD_ID ? `cho server ${GUILD_ID}` : '(toàn cục)'}`
  );
})().catch(console.error);
