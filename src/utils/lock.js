// Chạy tuần tự theo từng khóa (ví dụ từng kênh) để tránh xử lý chồng chéo
const locks = new Map();

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

module.exports = { runExclusive };
