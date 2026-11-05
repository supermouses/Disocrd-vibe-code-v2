// XP cần để lên level kế tiếp (công thức kiểu MEE6)
function xpForNextLevel(level) {
  return 5 * level ** 2 + 50 * level + 100;
}

module.exports = { xpForNextLevel };
