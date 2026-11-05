require('dotenv').config();
const mongoose = require('mongoose');
const { seedWords } = require('./wordchain/service');

// Nạp lại toàn bộ data/vi.txt và data/en.txt vào từ điển: npm run seed
(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  await seedWords(true);
  await mongoose.disconnect();
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
