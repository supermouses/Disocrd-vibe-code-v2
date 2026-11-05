const { Events, MessageFlags } = require('discord.js');

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction) {
    if (interaction.isAutocomplete()) {
      const cmd = interaction.client.commands.get(interaction.commandName);
      if (cmd?.autocomplete) await cmd.autocomplete(interaction).catch(console.error);
      return;
    }

    if (interaction.isButton()) {
      if (interaction.customId.startsWith('xd:')) {
        await require('../gambling/xidachService')
          .handleButton(interaction)
          .catch((err) => console.error('Lỗi nút xì dách:', err));
      }
      return;
    }

    if (!interaction.isChatInputCommand()) return;

    // Lệnh dùng trong server nhưng bot không có trong server đó (mời thiếu scope "bot")
    if (interaction.guildId && !interaction.guild) {
      return interaction
        .reply({
          content:
            '⚠️ Bot chưa được thêm đúng cách vào server này nên không dùng được lệnh. ' +
            'Hãy mời lại bot với scope **bot** và **applications.commands** (xem README).',
          flags: MessageFlags.Ephemeral,
        })
        .catch(() => {});
    }

    const command = interaction.client.commands.get(interaction.commandName);
    if (!command) return;

    try {
      await command.execute(interaction);
    } catch (err) {
      console.error(`Lỗi lệnh /${interaction.commandName}:`, err);
      const payload = { content: 'Có lỗi xảy ra khi chạy lệnh này 😢', flags: MessageFlags.Ephemeral };
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(payload).catch(() => {});
      } else {
        await interaction.reply(payload).catch(() => {});
      }
    }
  },
};
