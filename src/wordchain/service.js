const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');

const WordChain = require('../models/WordChain');
const Word = require('../models/Word');
const Proverb = require('../models/Proverb');
const WordScore = require('../models/WordScore');
const PROVERBS = require('./proverbs');
const { norm, fold, parseWord, firstKey, lastKey } = require('./text');

const BONUS_EVERY = 8; // cứ 8 từ nối thành công thì bot ra một câu tục ngữ
const BONUS_SECONDS = 60;
const BONUS_POINTS = 3;
const VOTE_SECONDS = 20;
const VOTE_THRESHOLD = 2; // số người khác (không tính người đặt từ) cần bấm ✅
const MAX_USED = 5000;

const STARTERS = {
  en: [
    'apple', 'elephant', 'tiger', 'river', 'sunshine', 'garden', 'window', 'happy', 'orange',
    'mountain', 'butterfly', 'chocolate', 'summer', 'friend', 'rainbow', 'journey', 'pencil',
    'lantern', 'harvest', 'dragon', 'planet', 'bridge', 'castle', 'forest',
  ],
  vi: ['học sinh', 'bàn ghế', 'quê hương', 'con mèo'],
};

const activeChannels = new Set(); // kênh đang chơi (để bỏ qua nhanh các kênh khác)
const pendingVotes = new Set(); // kênh đang chờ bỏ phiếu một từ chưa có trong từ điển
const locks = new Map();

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const react = (message, emoji) => message.react(emoji).catch(() => {});
const reply = (message, content) =>
  message.reply({ content, allowedMentions: { repliedUser: false } }).catch(() => {});

// Xử lý tuần tự theo từng kênh, tránh 2 người gửi cùng lúc làm hỏng chuỗi
function runExclusive(key, fn) {
  const prev = locks.get(key) ?? Promise.resolve();
  const next = prev.then(fn);
  const tail = next.catch(() => {});
  locks.set(key, tail);
  tail.then(() => {
    if (locks.get(key) === tail) locks.delete(key);
  });
  return next;
}

// ---------- Từ điển ----------

async function checkEnglish(word) {
  const res = await fetch(`https://api.dictionaryapi.dev/v2/entries/en/${encodeURIComponent(word)}`, {
    signal: AbortSignal.timeout(4000),
  });
  if (res.status === 200) return true;
  if (res.status === 404) return false;
  throw new Error(`Dictionary API HTTP ${res.status}`);
}

async function seedWords(force = false) {
  for (const lang of ['vi', 'en']) {
    const file = path.join(__dirname, '..', '..', 'data', `${lang}.txt`);
    if (!fs.existsSync(file)) continue;
    if (!force && (await Word.exists({ lang, source: 'seed' }))) continue;

    const words = [
      ...new Set(
        fs
          .readFileSync(file, 'utf8')
          .split(/\r?\n/)
          .map(norm)
          .filter((w) => parseWord(lang, w))
      ),
    ];
    for (let i = 0; i < words.length; i += 5000) {
      await Word.bulkWrite(
        words.slice(i, i + 5000).map((word) => ({
          updateOne: { filter: { lang, word }, update: { $setOnInsert: { source: 'seed' } }, upsert: true },
        })),
        { ordered: false }
      );
    }
    console.log(`Đã nạp ${words.length} từ (${lang}) vào từ điển`);
  }
}

async function init() {
  await seedWords(false);
  if ((await Proverb.countDocuments()) === 0) await Proverb.insertMany(PROVERBS);

  const games = await WordChain.find({}, 'channelId');
  games.forEach((g) => activeChannels.add(g.channelId));
  await WordChain.updateMany({ bonus: { $ne: null } }, { $set: { bonus: null } }); // bỏ vòng thưởng dang dở
}

// ---------- Điều khiển trò chơi ----------

const isActive = (channelId) => activeChannels.has(channelId);

async function pickStartWord(lang) {
  // Tiếng Anh: từ điển rất lớn có nhiều từ lạ, nên chọn từ khởi đầu trong danh sách quen thuộc
  if (lang === 'vi') {
    const [w] = await Word.aggregate([{ $match: { lang } }, { $sample: { size: 1 } }]);
    if (w) return w.word;
  }
  const list = STARTERS[lang];
  return list[Math.floor(Math.random() * list.length)];
}

function rulesText(lang, start) {
  const hint = lastKey(lang, start);
  if (lang === 'vi') {
    return (
      `🎮 **NỐI TỪ TIẾNG VIỆT** — ai cũng chơi được!\n` +
      `• Từ gồm **2 tiếng**, tiếng đầu phải trùng **tiếng cuối** của từ trước.\n` +
      `• Không dùng lại từ đã dùng, không trả lời 2 lần liên tiếp.\n` +
      `• Từ chưa có trong từ điển sẽ được mọi người bỏ phiếu ✅/❌.\n` +
      `• Cứ vài từ bot sẽ ra câu tục ngữ điền chỗ trống để lấy điểm thưởng.\n` +
      `• Muốn trò chuyện thường, hãy bắt đầu tin nhắn bằng \`//\`.\n\n` +
      `Từ bắt đầu: **${start}** → hãy nối bằng từ bắt đầu với **${hint}**`
    );
  }
  return (
    `🎮 **ENGLISH WORD CHAIN** — everyone can play!\n` +
    `• Your word must start with the **last letter** of the previous word.\n` +
    `• No repeated words, and no answering twice in a row.\n` +
    `• Every few words I'll post a proverb with a blank for bonus points.\n` +
    `• To chat normally, start your message with \`//\`.\n\n` +
    `Starting word: **${start}** → give me a word starting with **${hint.toUpperCase()}**`
  );
}

function startGame(channel, lang) {
  return runExclusive(channel.id, async () => {
    const start = await pickStartWord(lang);
    await WordChain.findOneAndUpdate(
      { channelId: channel.id },
      {
        guildId: channel.guild.id,
        channelId: channel.id,
        lang,
        currentWord: start,
        lastUserId: null,
        usedWords: [start],
        chainLength: 0,
        sinceBonus: 0,
        bonus: null,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    activeChannels.add(channel.id);
    await channel.send(rulesText(lang, start));
  });
}

async function restartGame(channel) {
  const game = await WordChain.findOne({ channelId: channel.id });
  if (!game) return false;
  await startGame(channel, game.lang);
  return true;
}

async function stopGame(channelId) {
  activeChannels.delete(channelId);
  const res = await WordChain.deleteOne({ channelId });
  return res.deletedCount > 0;
}

// ---------- Xử lý tin nhắn ----------

function handleMessage(message) {
  return runExclusive(message.channelId, () => processMessage(message)).catch((err) =>
    console.error('Lỗi nối từ:', err)
  );
}

async function processMessage(message) {
  const game = await WordChain.findOne({ channelId: message.channelId });
  if (!game) {
    activeChannels.delete(message.channelId);
    return;
  }
  if (pendingVotes.has(game.channelId)) return; // đang bỏ phiếu một từ

  // Trả lời đúng câu tục ngữ đang mở?
  if (game.bonus && fold(message.content) === fold(game.bonus.answer)) {
    return awardBonus(message, game);
  }

  const word = parseWord(game.lang, message.content);
  if (!word) return; // không phải lượt chơi, bỏ qua

  if (message.author.id === game.lastUserId) return react(message, '⏳');
  if (game.usedWords.includes(word)) return react(message, '🔁');
  if (firstKey(game.lang, word) !== lastKey(game.lang, game.currentWord)) return react(message, '❌');

  // Kiểm tra từ điển
  let source = 'seed';
  const known = await Word.exists({ lang: game.lang, word });
  if (!known) {
    if (game.lang === 'en') {
      let ok;
      try {
        ok = await checkEnglish(word);
      } catch (err) {
        console.error(err);
        return reply(message, '⚠️ Hiện chưa kiểm tra được từ điển tiếng Anh, thử lại sau nhé.');
      }
      if (!ok) return react(message, '❌');
      source = 'api';
    } else {
      startVote(message, game, word).catch(console.error); // không chặn hàng đợi
      return;
    }
  }

  await acceptWord(message, game, word, source);
}

async function acceptWord(message, game, word, source) {
  game.currentWord = word;
  game.lastUserId = message.author.id;
  game.usedWords.push(word);
  if (game.usedWords.length > MAX_USED) game.usedWords.shift();
  game.chainLength += 1;
  game.bestChain = Math.max(game.bestChain, game.chainLength);
  game.sinceBonus += 1;
  await game.save();

  await Promise.all([
    Word.updateOne(
      { lang: game.lang, word },
      { $setOnInsert: { source }, $inc: { timesUsed: 1 } },
      { upsert: true }
    ),
    WordScore.updateOne(
      { guildId: game.guildId, userId: message.author.id, lang: game.lang },
      { $inc: { points: 1, words: 1 } },
      { upsert: true }
    ),
  ]);

  const hint = lastKey(game.lang, word);
  await reply(
    message,
    game.lang === 'vi'
      ? `✅ **${word}** (+1) • chuỗi **${game.chainLength}**\n➡️ Từ tiếp theo bắt đầu bằng **${hint}**`
      : `✅ **${word}** (+1) • chain **${game.chainLength}**\n➡️ Next word starts with **${hint.toUpperCase()}**`
  );

  if (game.sinceBonus >= BONUS_EVERY && !game.bonus) await postBonus(message.channel, game);
}

// ---------- Bỏ phiếu cho từ tiếng Việt chưa có trong từ điển ----------

async function startVote(message, game, word) {
  const { channelId } = game;
  const prevWord = game.currentWord;
  pendingVotes.add(channelId);

  try {
    const prompt = await message.reply({
      content:
        `📖 **${word}** chưa có trong từ điển. Cần ít nhất **${VOTE_THRESHOLD}** người khác bấm ✅ ` +
        `trong ${VOTE_SECONDS} giây nếu đây là từ có nghĩa (❌ nếu không).`,
      allowedMentions: { repliedUser: false },
    });
    await prompt.react('✅');
    await prompt.react('❌');
    await sleep(VOTE_SECONDS * 1000);

    const fresh = await prompt.fetch();
    const count = async (emoji) => {
      const r = fresh.reactions.cache.get(emoji);
      if (!r) return 0;
      const users = await r.users.fetch();
      return users.filter((u) => !u.bot && u.id !== message.author.id).size;
    };
    const [yes, no] = await Promise.all([count('✅'), count('❌')]);

    if (yes >= VOTE_THRESHOLD && yes > no) {
      await runExclusive(channelId, async () => {
        const g = await WordChain.findOne({ channelId });
        if (!g || g.currentWord !== prevWord || g.usedWords.includes(word)) {
          await prompt.edit(`⌛ Vòng chơi đã thay đổi, từ **${word}** không còn áp dụng.`).catch(() => {});
          return;
        }
        await prompt.edit(`✅ **${word}** được duyệt (✅ ${yes} / ❌ ${no}) và đã lưu vào từ điển.`).catch(() => {});
        await acceptWord(message, g, word, 'vote');
      });
    } else {
      await prompt.edit(`❌ **${word}** không được duyệt (✅ ${yes} / ❌ ${no}).`).catch(() => {});
    }
  } finally {
    pendingVotes.delete(channelId);
  }
}

// ---------- Vòng thưởng: điền vào chỗ trống ----------

async function postBonus(channel, game) {
  const [p] = await Proverb.aggregate([{ $match: { lang: game.lang } }, { $sample: { size: 1 } }]);
  game.sinceBonus = 0;
  if (!p) return game.save();

  const token = randomUUID();
  game.bonus = {
    proverbId: p._id,
    text: p.text,
    answer: p.answer,
    token,
    expiresAt: new Date(Date.now() + BONUS_SECONDS * 1000),
  };
  await game.save();

  await channel
    .send(
      game.lang === 'vi'
        ? `🎁 **Điền vào chỗ trống** (+${BONUS_POINTS} điểm, ${BONUS_SECONDS} giây):\n> ${p.text}`
        : `🎁 **Fill in the blank** (+${BONUS_POINTS} points, ${BONUS_SECONDS}s):\n> ${p.text}`
    )
    .catch(() => {});

  setTimeout(() => {
    runExclusive(game.channelId, async () => {
      const g = await WordChain.findOne({ channelId: game.channelId });
      if (!g?.bonus || g.bonus.token !== token) return;
      const full = g.bonus.text.replace('___', `**${g.bonus.answer}**`);
      g.bonus = null;
      await g.save();
      await channel.send(`⌛ Hết giờ! Đáp án: ${full}`).catch(() => {});
    }).catch(console.error);
  }, BONUS_SECONDS * 1000);
}

async function awardBonus(message, game) {
  const { text, answer } = game.bonus;
  game.bonus = null;
  await game.save();

  await WordScore.updateOne(
    { guildId: game.guildId, userId: message.author.id, lang: game.lang },
    { $inc: { points: BONUS_POINTS, bonuses: 1 } },
    { upsert: true }
  );

  // Đáp án đúng định dạng của ngôn ngữ thì cũng lưu vào từ điển
  const parsed = parseWord(game.lang, answer);
  if (parsed) {
    await Word.updateOne({ lang: game.lang, word: parsed }, { $setOnInsert: { source: 'proverb' } }, { upsert: true });
  }

  await reply(message, `🎉 Chính xác! (+${BONUS_POINTS})\n> ${text.replace('___', `**${answer}**`)}`);
}

module.exports = { init, seedWords, isActive, startGame, restartGame, stopGame, handleMessage };
