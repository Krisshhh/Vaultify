const express = require('express');
const router = express.Router();
const upload = require('../middlewares/multer');
const auth = require('../middlewares/authMiddleware');
const { uploadFile } = require('../controllers/fileController');
const { downloadFile } = require('../controllers/fileController');


router.get('/download/:token', downloadFile);


// router.post('/upload', auth, upload.single('file'), uploadFile);
router.post('/upload', auth, upload.single('file'), uploadFile);

module.exports = router;