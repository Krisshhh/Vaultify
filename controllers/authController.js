const User = require('../models/User');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const Otp = require('../models/Otp');
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
    const token = createToken(user);
    res.status(201).json({ token });
  } catch (err) {
    res.status(400).json({ message: 'Signup failed', error: err.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password)))
      return res.status(401).json({ message: 'Invalid credentials' });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    await Otp.create({
      email,
      code: otp,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    });

    await sendOTP(email, otp);

    return res.status(200).json({ message: 'OTP sent to email' });
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