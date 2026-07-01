const cloudinary = require('cloudinary').v2;

const cloudName = process.env.CLOUDINARY_CLOUD_NAME || process.env.cloud_name;
const apiKey = process.env.CLOUDINARY_API_KEY || process.env.api_key;
const apiSecret = process.env.CLOUDINARY_API_SECRET || process.env.api_secret;
const folder = process.env.CLOUDINARY_FOLDER || 'iiit_surat_archive';

cloudinary.config({
  cloud_name: cloudName,
  api_key: apiKey,
  api_secret: apiSecret,
});

module.exports = { cloudinary, folder };
