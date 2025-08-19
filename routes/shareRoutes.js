const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const {
  shareFile,
  generateQRCode,
  getSharedFiles,
  getMySharedFiles,
  accessSharedFile,
  accessQRSharedFile,
  downloadSharedFile,
  getQRCodeDetails,
  revokeShare
} = require('../controllers/shareController');

// Share a file with another user
router.post('/share', authMiddleware, shareFile);

// Generate QR code for file sharing
router.post('/generate-qr', authMiddleware, generateQRCode);

// Test route for debugging
router.post('/test-qr', authMiddleware, async (req, res) => {
  try {
    console.log('Test QR request:', req.body);
    res.json({ message: 'Test successful', received: req.body });
  } catch (err) {
    console.error('Test error:', err);
    res.status(500).json({ message: 'Test failed', error: err.message });
  }
});

// Get QR code details
router.get('/qr-details/:shareId', authMiddleware, getQRCodeDetails);

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

// Access shared file via QR token (public route)
router.get('/qr/:token', accessQRSharedFile);

module.exports = router;
