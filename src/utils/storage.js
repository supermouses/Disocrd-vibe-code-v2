const { Readable } = require('node:stream');
const { pipeline } = require('node:stream/promises');
const mongoose = require('mongoose');

// File nhạc được lưu thẳng trong MongoDB bằng GridFS (bucket "songs")
let bucket;
function getBucket() {
  if (!bucket) {
    bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: 'songs' });
  }
  return bucket;
}

async function saveFromUrl(url, filename, contentType) {
  const res = await fetch(url);
  if (!res.ok || !res.body) throw new Error(`Không tải được file (HTTP ${res.status})`);

  const upload = getBucket().openUploadStream(filename, { contentType });
  await pipeline(Readable.fromWeb(res.body), upload);
  return upload.id;
}

function openDownload(fileId) {
  return getBucket().openDownloadStream(fileId);
}

async function deleteFile(fileId) {
  await getBucket().delete(fileId);
}

module.exports = { saveFromUrl, openDownload, deleteFile };
