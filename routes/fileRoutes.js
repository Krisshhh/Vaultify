const express = require('express');
const router = express.Router();
const upload = require('../middlewares/multer');
const auth = require('../middlewares/authMiddleware');

const {
  uploadFile,
  downloadFile,
  getUserDashboard
} = require('../controllers/fileController');

router.post('/upload', auth, upload.single('file'), uploadFile);
router.get('/download/:token', downloadFile);
router.get('/dashboard', auth, getUserDashboard);

module.exports = router;