const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { getControlSession } = require('../music/player');

module.exports = {
  data: new SlashCommandBuilder().setName('skip').setDescription('Bỏ qua bài đang phát').setContexts(0),
  async execute(interaction) {
    const { session, error } = getControlSession(interaction);
    if (error) return interaction.reply({ content: error, flags: MessageFlags.Ephemeral });

    const title = session.current?.title;
    session.player.stop(); // sự kiện Idle sẽ tự chuyển sang bài kế tiếp
    await interaction.reply(title ? `⏭️ Đã bỏ qua **${title}**.` : '⏭️ Đã bỏ qua.');
  },
};
