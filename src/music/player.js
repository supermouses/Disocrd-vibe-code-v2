const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  VoiceConnectionStatus,
  NoSubscriberBehavior,
  entersState,
} = require('@discordjs/voice');
const { PermissionFlagsBits } = require('discord.js');
const { openDownload } = require('../utils/storage');
const { openUrlStream } = require('../utils/urlStream');

const IDLE_LEAVE_MS = 2 * 60 * 1000; // rời kênh sau 2 phút không có nhạc
const MAX_QUEUE = 50;

// guildId -> { connection, player, queue, current, channelId, textChannel, idleTimer }
const sessions = new Map();

function destroySession(guildId) {
  const s = sessions.get(guildId);
  if (!s) return;
  sessions.delete(guildId);
  clearTimeout(s.idleTimer);
  s.queue.length = 0;
  s.current = null;
  s.player.stop(true);
  if (s.connection.state.status !== VoiceConnectionStatus.Destroyed) s.connection.destroy();
}

async function playNext(s, announce = true) {
  clearTimeout(s.idleTimer);
  const next = s.queue.shift();

  if (!next) {
    s.current = null;
    s.idleTimer = setTimeout(() => destroySession(s.guildId), IDLE_LEAVE_MS);
    return;
  }

  s.current = next;
  let stream;
  try {
    // next.url: bài từ link; next.fileId: bài trong thư viện MongoDB
    stream = next.url ? await openUrlStream(next.url) : openDownload(next.fileId);
  } catch (err) {
    s.current = null;
    s.textChannel?.send(`⚠️ Không phát được **${next.title}**: ${err.message}`).catch(() => {});
    return playNext(s, announce);
  }
  s.player.play(createAudioResource(stream, { metadata: next }));
  if (announce) s.textChannel?.send(`🎶 Đang phát: **${next.title}**`).catch(() => {});
}

async function ensureSession(interaction, voiceChannel) {
  const guildId = interaction.guildId;
  const existing = sessions.get(guildId);
  if (existing) return existing;

  const connection = joinVoiceChannel({
    channelId: voiceChannel.id,
    guildId,
    adapterCreator: interaction.guild.voiceAdapterCreator,
    selfDeaf: true,
  });

  try {
    await entersState(connection, VoiceConnectionStatus.Ready, 20_000);
  } catch {
    connection.destroy();
    throw new Error('Không kết nối được kênh thoại, thử lại sau nhé.');
  }

  const player = createAudioPlayer({ behaviors: { noSubscriber: NoSubscriberBehavior.Pause } });
  connection.subscribe(player);

  const s = {
    guildId,
    connection,
    player,
    queue: [],
    current: null,
    channelId: voiceChannel.id,
    textChannel: interaction.channel,
    idleTimer: null,
  };
  sessions.set(guildId, s);

  // Hết bài (hoặc bài lỗi) -> sang bài kế tiếp
  player.on(AudioPlayerStatus.Idle, () => {
    s.current = null;
    playNext(s, true).catch(console.error);
  });
  player.on('error', (err) => {
    console.error('Lỗi phát nhạc:', err);
    s.textChannel?.send('⚠️ Không phát được bài này, chuyển sang bài tiếp theo.').catch(() => {});
  });

  // Bị kick / chuyển kênh: thử kết nối lại, không được thì dọn dẹp
  connection.on(VoiceConnectionStatus.Disconnected, async () => {
    try {
      await Promise.race([
        entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
        entersState(connection, VoiceConnectionStatus.Connecting, 5_000),
      ]);
    } catch {
      destroySession(guildId);
    }
  });
  connection.on(VoiceConnectionStatus.Destroyed, () => destroySession(guildId));

  return s;
}

// Thêm bài vào hàng đợi. Trả về vị trí (0 = phát ngay)
function enqueue(s, song) {
  if (s.queue.length >= MAX_QUEUE) throw new Error(`Hàng đợi đã đầy (${MAX_QUEUE} bài).`);
  s.queue.push(song);
  s.textChannel = s.textChannel ?? null;

  if (!s.current && s.player.state.status === AudioPlayerStatus.Idle) {
    playNext(s, false).catch(console.error);
    return 0;
  }
  return s.queue.length;
}

// Dùng chung cho /play và /playurl (interaction phải đã deferReply)
// item: { title, fileId } hoặc { title, url }
async function playItem(interaction, item) {
  const fail = (content) => interaction.editReply({ content });

  const voiceChannel = interaction.member.voice?.channel;
  if (!voiceChannel) return fail('Bạn cần vào một kênh thoại trước.');

  const perms = voiceChannel.permissionsFor(interaction.guild.members.me);
  if (!perms.has([PermissionFlagsBits.Connect, PermissionFlagsBits.Speak])) {
    return fail('Bot không có quyền Connect/Speak trong kênh thoại này.');
  }

  const existing = sessions.get(interaction.guildId);
  if (existing && existing.channelId !== voiceChannel.id) {
    return fail('Bot đang phát nhạc ở kênh thoại khác.');
  }

  try {
    const session = await ensureSession(interaction, voiceChannel);
    session.textChannel = interaction.channel;
    const position = enqueue(session, item);
    await interaction.editReply(
      position === 0
        ? `▶️ Đang phát: **${item.title}**`
        : `➕ Đã thêm **${item.title}** vào hàng đợi (vị trí ${position}).`
    );
  } catch (err) {
    await fail(`❌ ${err.message}`);
  }
}

// Dùng cho các lệnh điều khiển: kiểm tra bot đang phát và người dùng ở cùng kênh thoại
function getControlSession(interaction) {
  const s = sessions.get(interaction.guildId);
  if (!s) return { error: 'Bot hiện không phát nhạc.' };
  if (interaction.member.voice?.channelId !== s.channelId) {
    return { error: 'Bạn cần ở cùng kênh thoại với bot.' };
  }
  return { session: s };
}

module.exports = { ensureSession, enqueue, playItem, getControlSession, destroySession, sessions };
