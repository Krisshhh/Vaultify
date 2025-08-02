const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const {
  shareFile,
  getSharedFiles,
  getMySharedFiles,
  accessSharedFile,
  downloadSharedFile,
  revokeShare
} = require('../controllers/shareController');

// Share a file with another user
router.post('/share', authMiddleware, shareFile);

// Get files shared with me
router.get('/received', authMiddleware, getSharedFiles);

// Get files I have shared
router.get('/sent', authMiddleware, getMySharedFiles);

// Revoke a file share
router.delete('/revoke/:shareId', authMiddleware, revokeShare);

// Download shared file via token (public route)
router.get('/download/:token', downloadSharedFile);

// Access shared file via token (public route)
router.get('/view/:token', accessSharedFile);

module.exports = router;
