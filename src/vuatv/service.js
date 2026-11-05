const { randomUUID } = require('node:crypto');

const VuaTV = require('../models/VuaTV');
const VuaTVScore = require('../models/VuaTVScore');
const Word = require('../models/Word');
const { runExclusive } = require('../utils/lock');
const { norm, parseWord } = require('../wordchain/text');
const { letterList, letterKey, shuffleLetters, hintText, pointsFor } = require('./puzzle');

const NEXT_DELAY_MS = 5000; // nghỉ giữa các vòng
const MAX_RECENT = 40;
const FALLBACK = ['khớp cứng', 'học sinh', 'quê hương', 'bàn ghế', 'thể thao'];

const activeChannels = new Set();
const timers = new Map(); // channelId -> [timeout...]

const reply = (message, content) =>
  message.reply({ content, allowedMentions: { repliedUser: false } }).catch(() => {});

function clearTimers(channelId) {
  (timers.get(channelId) ?? []).forEach(clearTimeout);
  timers.delete(channelId);
}

function later(channelId, atMs, fn) {
  const t = setTimeout(() => {
    Promise.resolve(fn()).catch((err) => console.error('Lỗi Vua Tiếng Việt:', err));
  }, Math.max(0, atMs - Date.now()));
  timers.set(channelId, [...(timers.get(channelId) ?? []), t]);
}

const isActive = (channelId) => activeChannels.has(channelId);

// ---------- Vòng chơi ----------

async function pickWord(recent) {
  const [w] = await Word.aggregate([
    // 6-12 chữ cái (không tính khoảng trắng), chưa ra gần đây
    { $match: { lang: 'vi', word: { $regex: '^.{7,13}$', $nin: recent } } },
    { $sample: { size: 1 } },
  ]);
  if (w) return w.word;
  const candidates = FALLBACK.filter((x) => !recent.includes(x));
  const list = candidates.length ? candidates : FALLBACK;
  return list[Math.floor(Math.random() * list.length)];
}

// Gọi khi đã giữ khóa của kênh
async function beginRound(channel) {
  const game = await VuaTV.findOne({ channelId: channel.id });
  if (!game) return;

  const answer = await pickWord(game.recent);
  const now = Date.now();
  game.answer = answer;
  game.letters = shuffleLetters(answer);
  game.token = randomUUID();
  game.startedAt = new Date(now);
  game.endsAt = new Date(now + game.roundSeconds * 1000);
  game.hintStage = 0;
  game.roundNumber += 1;
  game.recent.push(answer);
  if (game.recent.length > MAX_RECENT) game.recent.shift();
  await game.save();

  const ts = Math.floor(game.endsAt.getTime() / 1000);
  await channel
    .send(
      `🧩 **Vua Tiếng Việt** • Vòng ${game.roundNumber}\n` +
        `Từ cần đoán: \`${game.letters.join('/')}\` (gồm ${game.letters.length} ký tự)\n` +
        `⏱️ Kết thúc: <t:${ts}:R> (<t:${ts}:T>)`
    )
    .catch(() => {});

  schedule(channel, game);
}

const startRound = (channel) => runExclusive(channel.id, () => beginRound(channel));

function schedule(channel, game) {
  clearTimers(channel.id);
  const token = game.token;
  const start = game.startedAt.getTime();
  const end = game.endsAt.getTime();
  const third = (end - start) / 3;
  const guard = (fn) => () => runExclusive(channel.id, fn);

  later(channel.id, start + third, guard(() => hint(channel, token, 1)));
  later(channel.id, start + 2 * third, guard(() => hint(channel, token, 2)));
  later(channel.id, end, guard(() => timeUp(channel, token)));
}

async function hint(channel, token, stage) {
  const game = await VuaTV.findOne({ channelId: channel.id });
  if (!game?.answer || game.token !== token || game.hintStage >= stage) return;
  game.hintStage = stage;
  await game.save();
  await channel.send(`💡 Gợi ý ${stage}/2: ${hintText(game.answer, stage)}`).catch(() => {});
}

async function finishRound(channel, game) {
  game.answer = null;
  game.token = null;
  await game.save();
  clearTimers(channel.id);
  later(channel.id, Date.now() + NEXT_DELAY_MS, () => startRound(channel));
}

async function timeUp(channel, token) {
  const game = await VuaTV.findOne({ channelId: channel.id });
  if (!game?.answer || game.token !== token) return;
  const answer = game.answer;
  await finishRound(channel, game);
  await channel
    .send(`⌛ Hết giờ, không ai đoán đúng. Đáp án là **${answer}**.\n⏭️ Vòng tiếp theo sau ${NEXT_DELAY_MS / 1000} giây...`)
    .catch(() => {});
}

// ---------- Quản lý ----------

function startGame(channel, seconds) {
  return runExclusive(channel.id, async () => {
    await VuaTV.findOneAndUpdate(
      { channelId: channel.id },
      {
        guildId: channel.guild.id,
        channelId: channel.id,
        roundSeconds: seconds,
        answer: null,
        token: null,
      },
      { upsert: true, setDefaultsOnInsert: true }
    );
    activeChannels.add(channel.id);
    clearTimers(channel.id);
    await channel.send(
      `🎮 **VUA TIẾNG VIỆT** bắt đầu! Các chữ cái của một từ tiếng Việt sẽ bị xáo trộn, ` +
        `ai ghép đúng trước được điểm (càng ít gợi ý càng nhiều điểm).\n` +
        `Mỗi vòng ${seconds} giây. Muốn trò chuyện thường, hãy bắt đầu tin nhắn bằng \`//\`.`
    );
    await beginRound(channel);
  });
}

async function stopGame(channelId) {
  activeChannels.delete(channelId);
  clearTimers(channelId);
  const res = await VuaTV.deleteOne({ channelId });
  return res.deletedCount > 0;
}

function skipRound(channel) {
  return runExclusive(channel.id, async () => {
    const game = await VuaTV.findOne({ channelId: channel.id });
    if (!game?.answer) return false;
    const answer = game.answer;
    await finishRound(channel, game);
    await channel.send(`⏭️ Bỏ qua vòng này. Đáp án là **${answer}**.`).catch(() => {});
    return true;
  });
}

// Khi bot khởi động lại: tiếp tục các vòng đang dở
async function init(client) {
  const games = await VuaTV.find({});
  for (const game of games) {
    const channel = await client.channels.fetch(game.channelId).catch(() => null);
    if (!channel) continue;
    activeChannels.add(game.channelId);
    if (game.answer && game.endsAt) schedule(channel, game);
    else startRound(channel).catch(console.error);
  }
}

// ---------- Xử lý tin nhắn ----------

function handleMessage(message) {
  return runExclusive(message.channelId, () => processMessage(message)).catch((err) =>
    console.error('Lỗi Vua Tiếng Việt:', err)
  );
}

async function processMessage(message) {
  const game = await VuaTV.findOne({ channelId: message.channelId });
  if (!game) {
    activeChannels.delete(message.channelId);
    return;
  }
  if (!game.answer || Date.now() > game.endsAt.getTime()) return;

  const text = norm(message.content);
  if (!text || text.length > 40) return;
  if (letterKey(text) !== letterKey(game.answer)) return; // không phải lượt đoán

  // Đúng đáp án, hoặc một từ có nghĩa khác cùng bộ chữ cái
  let correct = text === game.answer;
  if (!correct && parseWord('vi', text)) {
    correct = Boolean(await Word.exists({ lang: 'vi', word: text }));
  }
  if (!correct) {
    message.react('❌').catch(() => {});
    return;
  }

  const points = pointsFor(game.hintStage);
  const answer = game.answer;
  await finishRound(message.channel, game);
  await VuaTVScore.updateOne(
    { guildId: game.guildId, userId: message.author.id },
    { $inc: { points, wins: 1 } },
    { upsert: true }
  );

  const alt = text !== answer ? ` (từ gốc: **${answer}**)` : '';
  await reply(
    message,
    `🎉 ${message.author} đoán đúng: **${text}**${alt} (+${points} điểm)\n` +
      `⏭️ Vòng tiếp theo sau ${NEXT_DELAY_MS / 1000} giây...`
  );
}

module.exports = { init, isActive, startGame, stopGame, skipRound, handleMessage };
