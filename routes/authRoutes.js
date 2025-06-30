const express = require('express');
const router = express.Router();
const { signup, login, verifyOtp, requestPasswordReset, resetPassword} = require('../controllers/authController');

router.post('/signup', signup);
router.post('/login', login);
router.post('/verify-otp', verifyOtp);
router.post('/forgot-password', requestPasswordReset);
router.post('/reset-password', resetPassword);

module.exports = router;