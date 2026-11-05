// Các hàm thuần (không cần database) của trò Vua Tiếng Việt

// Tách từ thành từng chữ cái, bỏ khoảng trắng: "khớp cứng" -> ['k','h','ớ','p','c','ứ','n','g']
const letterList = (word) => Array.from(word.replace(/ /g, ''));

// Khóa so sánh các từ có cùng bộ chữ cái (đảo chữ)
const letterKey = (word) => letterList(word).sort().join('');

// Xáo trộn chữ cái, đảm bảo khác thứ tự ban đầu
function shuffleLetters(word) {
  const original = letterList(word);
  let arr = [...original];
  for (let attempt = 0; attempt < 20; attempt++) {
    arr = [...original];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    if (arr.join('') !== original.join('')) break;
  }
  return arr;
}

// Gợi ý theo cấp: 1 = số chữ của từng tiếng, 2 = thêm chữ đầu của từng tiếng
function hintText(answer, stage) {
  const parts = answer.split(' ').map((p) => Array.from(p));
  if (stage === 1) {
    return `Từ gồm **${parts.length} tiếng**: ${parts.map((p) => `${p.length} chữ`).join(' + ')}`;
  }
  return `Chữ đầu mỗi tiếng: \`${parts.map((p) => p[0] + '_'.repeat(p.length - 1)).join(' ')}\``;
}

// Điểm giảm dần theo số gợi ý đã hiện
const pointsFor = (hintStage) => Math.max(1, 3 - hintStage);

module.exports = { letterList, letterKey, shuffleLetters, hintText, pointsFor };
