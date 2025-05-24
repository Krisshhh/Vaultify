const express = require('express');
const router = express.Router();
const { signup, login, verifyOtp } = require('../controllers/authController');

router.post('/signup', signup);
router.post('/login', login);
router.post('/verify-otp', verifyOtp);

module.exports = router;
