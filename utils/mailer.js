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

// console.log('Mailer Auth:', process.env.EMAIL_USER, process.env.EMAIL_PASS ? 'PASS PRESENT' : 'MISSING');
