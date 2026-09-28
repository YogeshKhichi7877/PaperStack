const PHOTO_TYPES = {
  'image/jpeg': /\.jpe?g$/i,
  'image/png': /\.png$/i,
  'image/webp': /\.webp$/i,
};

function normalizeDisplayName(value) {
  if (typeof value !== 'string') return '';
  return value.trim().replace(/\s+/g, ' ');
}

function validDisplayName(value) {
  return value.length >= 2 && value.length <= 60 && !/[<>\u0000-\u001f\u007f]/.test(value);
}

function imageContentType(buffer) {
  if (buffer.length >= 3 && buffer.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) return 'image/jpeg';
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return 'image/png';
  if (buffer.length >= 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') return 'image/webp';
  return null;
}

function validPhoto(file) {
  const actual = file?.buffer && imageContentType(file.buffer);
  return Boolean(actual && actual === file.mimetype && PHOTO_TYPES[actual].test(file.originalname || ''));
}

module.exports = { PHOTO_TYPES, normalizeDisplayName, validDisplayName, validPhoto };
