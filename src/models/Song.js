const { Schema, model } = require('mongoose');

const songSchema = new Schema(
  {
    guildId: { type: String, required: true, index: true },
    title: { type: String, required: true, maxlength: 100 },
    filename: { type: String, required: true },
    contentType: { type: String, default: 'application/octet-stream' },
    size: { type: Number, required: true },
    fileId: { type: Schema.Types.ObjectId, required: true }, // _id của file trong GridFS (bucket "songs")
    uploaderId: { type: String, required: true },
  },
  { timestamps: true }
);

module.exports = model('Song', songSchema);
