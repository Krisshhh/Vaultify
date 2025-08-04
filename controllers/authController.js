const User = require('../models/User');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const axios = require('axios');
const Otp = require('../models/Otp');
const Analytics = require('../models/Analytics');
const { sendOTP, sendResetLink } = require('../utils/mailer');
const ResetToken = require('../models/resetToken');

const createToken = (user) => {
  return jwt.sign(
    { id: user._id, username: user.username },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

exports.signup = async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const user = await User.create({ username, email, password });
    
    // Track signup analytics
    await Analytics.create({
      userId: user._id,
      eventType: 'user_signup',
      metadata: {
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }
    });
    
    const token = createToken(user);
    res.status(201).json({ token });
  } catch (err) {
    res.status(400).json({ message: 'Signup failed', error: err.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password, captchaToken } = req.body;
    const captchaSecretKey = process.env.CAPTCHA_SECRET_KEY;
    const captchaVerificationUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${captchaSecretKey}&response=${captchaToken}`;

    // Verify CAPTCHA
    const captchaResponse = await axios.post(captchaVerificationUrl);
    if (!captchaResponse.data.success) {
        return res.status(400).json({ message: 'Captcha verification failed' });
    }

    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Update last login time
    user.lastLogin = new Date();
    await user.save();
    
    // Track login analytics
    await Analytics.create({
      userId: user._id,
      eventType: 'user_login',
      metadata: {
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }
    });

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });

    return res.status(200).json({ token });
  } catch (err) {
    res.status(500).json({ message: 'Login failed', error: err.message });
  }
};

exports.verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    const record = await Otp.findOne({ email, code: otp });

    if (!record) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    if (record.expiresAt < new Date()) {
      return res.status(400).json({ message: 'OTP expired' });
    }

    await Otp.deleteMany({ email });

    const token = jwt.sign({ email }, process.env.JWT_SECRET, {
      expiresIn: '1h',
    });

    return res.status(200).json({ token });
  } catch (err) {
    res.status(500).json({ message: 'OTP verification failed', error: err.message });
  }
};

exports.requestPasswordReset = async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.status(400).json({ message: 'Email not registered' });

  const token = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

  await ResetToken.create({ email, token, expiresAt: expires });
  await sendResetLink(email, token);

  res.json({ message: 'Reset link sent to email' });
};

exports.resetPassword = async (req, res) => {
  const { token, password } = req.body;

  const record = await ResetToken.findOne({ token });
  if (!record || record.expiresAt < new Date()) {
    return res.status(400).json({ message: 'Token expired or invalid' });
  }

  const user = await User.findOne({ email: record.email });
  if (!user) return res.status(400).json({ message: 'User not found' });

  user.password = password;
  await user.save();
  await ResetToken.deleteMany({ email: record.email });

  res.json({ message: 'Password reset successful' });
};

// Admin login with OTP
exports.adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const user = await User.findOne({ email, role: 'admin' });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Invalid admin credentials' });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    await Otp.create({
      email,
      code: otp,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    });

    await sendOTP(email, otp);

    return res.status(200).json({ message: 'OTP sent to admin email' });
  } catch (err) {
    res.status(500).json({ message: 'Admin login failed', error: err.message });
  }
};

// Admin OTP verification
exports.verifyAdminOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    const record = await Otp.findOne({ email, code: otp });
    if (!record) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    if (record.expiresAt < new Date()) {
      return res.status(400).json({ message: 'OTP expired' });
    }

    const user = await User.findOne({ email, role: 'admin' });
    if (!user) {
      return res.status(401).json({ message: 'Admin not found' });
    }

    await Otp.deleteMany({ email });
    
    // Update last login and track analytics
    user.lastLogin = new Date();
    await user.save();
    
    await Analytics.create({
      userId: user._id,
      eventType: 'user_login',
      metadata: {
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }
    });

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
      expiresIn: '8h',
    });

    return res.status(200).json({ token, user: { id: user._id, username: user.username, role: user.role } });
  } catch (err) {
    res.status(500).json({ message: 'Admin OTP verification failed', error: err.message });
  }
};

// Get CAPTCHA site key for frontend
exports.getCaptchaConfig = async (req, res) => {
  try {
    res.json({ 
      siteKey: process.env.CAPTCHA_SITE_KEY || '' 
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to get CAPTCHA config', error: err.message });
  }
};
