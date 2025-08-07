const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

exports.sendOTP = async (to, otp) => {
  const mailOptions = {
    from: `"FileVault OTP" <${process.env.EMAIL_USER}>`,
    to,
    subject: 'Your OTP Code',
    text: `Your OTP is: ${otp}`,
  };

  await transporter.sendMail(mailOptions);
};

exports.sendResetLink = async (to, resetToken) => {
  const resetUrl = `http://localhost:5000/reset_pwd.html?token=${resetToken}`;
  const mailOptions = {
    from: `"FileVault Reset" <${process.env.EMAIL_USER}>`,
    to,
    subject: 'Password Reset Link',
    text: `Click the following link to reset your password: ${resetUrl}`,
    html: `<p>Click <a href="${resetUrl}">here</a> to reset your password. Link expires in 30 minutes.</p>`
  };

  await transporter.sendMail(mailOptions);
};