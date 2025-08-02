const express = require('express');
const router = express.Router();
const upload = require('../middlewares/multer');
const auth = require('../middlewares/authMiddleware');

const {
  uploadFile,
  downloadFile,
  getUserDashboard,
  getUserFiles,
  deleteUserFile
} = require('../controllers/fileController');

router.post('/upload', auth, upload.single('file'), uploadFile);
router.get('/download/:token', downloadFile);
router.get('/dashboard', auth, getUserDashboard);
router.get('/my-files', auth, getUserFiles);
router.delete('/delete/:fileId', auth, deleteUserFile);

module.exports = router;