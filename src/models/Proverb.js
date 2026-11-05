const { Schema, model } = require('mongoose');

const proverbSchema = new Schema({
  lang: { type: String, enum: ['en', 'vi'], required: true, index: true },
  text: { type: String, required: true }, // chứa "___" tại chỗ trống
  answer: { type: String, required: true },
});

module.exports = model('Proverb', proverbSchema);
