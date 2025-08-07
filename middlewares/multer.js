const multer = require('multer');

// Use memory storage since we'll upload directly to S3
// Reduced file size for Vercel serverless function limits (50MB max response)
const upload = multer({
  storage: multer.memoryStorage(), // Store file in memory
  limits: {
    fileSize: 40 * 1024 * 1024 // 40MB limit (safe for Vercel)
  },
  fileFilter: (req, file, cb) => {
    if (!file) {
      cb(new Error('No file provided'), false);
      return;
    }
    cb(null, true);
  }
});

module.exports = upload;