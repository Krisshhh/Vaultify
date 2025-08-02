const express = require('express');
const router = express.Router();
const { signup, login, verifyOtp, requestPasswordReset, resetPassword, adminLogin, verifyAdminOtp, getCaptchaConfig } = require('../controllers/authController');

router.post('/signup', signup);
router.post('/login', login);
router.post('/verify-otp', verifyOtp);
router.post('/forgot-password', requestPasswordReset);
router.post('/reset-password', resetPassword);
router.post('/admin/login', adminLogin);
router.post('/admin/verify-otp', verifyAdminOtp);
router.get('/captcha-config', getCaptchaConfig);

module.exports = router;