const { Events } = require('discord.js');
const wordchain = require('../wordchain/service');
const vuatv = require('../vuatv/service');

module.exports = {
  name: Events.ClientReady,
  once: true,
  async execute(client) {
    console.log(`Bot đã online: ${client.user.tag}`);
    try {
      await wordchain.init(); // nạp từ điển, câu tục ngữ và các kênh nối từ đang bật
      await vuatv.init(client); // tiếp tục các vòng Vua Tiếng Việt đang dở
    } catch (err) {
      console.error('Không khởi tạo được trò chơi:', err);
    }
  },
};
