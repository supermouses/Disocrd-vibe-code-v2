const VI_LETTERS =
  'aàáảãạăằắẳẵặâầấẩẫậbcdđeèéẻẽẹêềếểễệghiìíỉĩịklmnoòóỏõọôồốổỗộơờớởỡợpqrstuùúủũụưừứửữựvxyỳýỷỹỵ';
const VI_SYLLABLE = new RegExp(`^[${VI_LETTERS}]{1,10}$`);
const EN_WORD = /^[a-z]{2,30}$/;

// Thống nhất cách đặt dấu thanh: kiểu cũ (hoà, thuý) -> kiểu mới (hòa, thúy).
// Chỉ đổi ở cuối tiếng; "toàn", "ngoài", "quý", "huỳnh" giữ nguyên.
const OA = { à: 'òa', á: 'óa', ả: 'ỏa', ã: 'õa', ạ: 'ọa' };
const OE = { è: 'òe', é: 'óe', ẻ: 'ỏe', ẽ: 'õe', ẹ: 'ọe' };
const UY = { ỳ: 'ùy', ý: 'úy', ỷ: 'ủy', ỹ: 'ũy', ỵ: 'ụy' };
const fixTone = (s) =>
  s
    .replace(/o([àáảãạ])(?=\s|$)/g, (_, t) => OA[t])
    .replace(/o([èéẻẽẹ])(?=\s|$)/g, (_, t) => OE[t])
    .replace(/(?<!q)u([ỳýỷỹỵ])(?=\s|$)/g, (_, t) => UY[t]);

// chữ thường, chuẩn hóa dấu (NFC), thống nhất dấu thanh, gộp khoảng trắng
const norm = (s) => fixTone(s.normalize('NFC').toLowerCase().trim().replace(/\s+/g, ' '));

// bỏ dấu để so sánh lỏng (dùng cho đáp án câu tục ngữ)
const fold = (s) =>
  norm(s)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd');

// Trả về từ đã chuẩn hóa nếu đúng định dạng của ngôn ngữ, không thì null
//  - en: 1 từ, chỉ chữ cái a-z
//  - vi: đúng 2 tiếng, chỉ chữ cái tiếng Việt
function parseWord(lang, content) {
  const text = norm(content);
  if (lang === 'en') return EN_WORD.test(text) ? text : null;
  const parts = text.split(' ');
  return parts.length === 2 && parts.every((p) => VI_SYLLABLE.test(p)) ? text : null;
}

// en: chữ cái đầu / cuối. vi: tiếng đầu / tiếng cuối
const firstKey = (lang, w) => (lang === 'en' ? w[0] : w.split(' ')[0]);
const lastKey = (lang, w) => (lang === 'en' ? w[w.length - 1] : w.split(' ')[1]);

module.exports = { norm, fold, parseWord, firstKey, lastKey };
