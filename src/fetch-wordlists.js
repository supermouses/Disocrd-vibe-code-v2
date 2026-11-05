require('dotenv').config();
const fs = require('node:fs');
const path = require('node:path');
const mongoose = require('mongoose');
const { norm, parseWord } = require('./wordchain/text');
const { seedWords } = require('./wordchain/service');

// Tải bộ từ điển lớn về data/*.txt rồi nạp vào MongoDB.
//   npm run fetch-words        -> cả vi và en
//   npm run fetch-words vi     -> chỉ tiếng Việt
//   npm run fetch-words en     -> chỉ tiếng Anh
const SOURCES = {
  vi: {
    // Từ điển của Hồ Ngọc Đức (~74.000 từ/cụm từ, giấy phép GPL-2.0)
    url: 'https://raw.githubusercontent.com/duyet/vietnamese-wordlist/master/Viet74K.txt',
    keep: (w) => parseWord('vi', w), // chỉ giữ từ 2 tiếng
  },
  en: {
    // dwyl/english-words (~370.000 từ chỉ có chữ cái, Unlicense)
    url: 'https://raw.githubusercontent.com/dwyl/english-words/master/words_alpha.txt',
    keep: (w) => w.length >= 3 && w.length <= 15 && parseWord('en', w),
  },
};

async function download(lang) {
  const { url, keep } = SOURCES[lang];
  console.log(`Đang tải ${lang}: ${url}`);
  const res = await fetch(url, { signal: AbortSignal.timeout(120_000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const file = path.join(__dirname, '..', 'data', `${lang}.txt`);
  const existing = fs.existsSync(file) ? fs.readFileSync(file, 'utf8').split(/\r?\n/) : [];
  const incoming = (await res.text()).split(/\r?\n/);

  const words = new Set();
  for (const line of [...existing, ...incoming]) {
    const w = norm(line);
    if (w && keep(w)) words.add(w);
  }

  const sorted = [...words].sort((a, b) => a.localeCompare(b, lang));
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, sorted.join('\n') + '\n', 'utf8');
  console.log(`  -> ${sorted.length} từ đã lưu vào data/${lang}.txt`);
}

(async () => {
  const arg = process.argv[2];
  const langs = arg ? [arg] : ['vi', 'en'];
  for (const lang of langs) {
    if (!SOURCES[lang]) throw new Error(`Ngôn ngữ không hợp lệ: ${lang} (dùng vi hoặc en)`);
    try {
      await download(lang);
    } catch (err) {
      console.error(`Không tải được ${lang}: ${err.message}`);
    }
  }

  await mongoose.connect(process.env.MONGODB_URI);
  await seedWords(true); // nạp vào MongoDB (bỏ qua từ đã có)
  await mongoose.disconnect();
  console.log('Xong!');
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
