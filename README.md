# 🔐 Vaultify - Secure File Storage & Sharing Platform

A secure## 🔧 Admin Setup

Create admin user in MongoDB:
```javascript
db.users.updateOne(
  { email: "admin@yourdomain.com" },
  { $set: { role: "admin" } }
)
```

## 🔒 Security

- **File Encryption**: AES-256-CBC encryption before cloud storage
- **Authentication**: JWT tokens with role-based access control
- **Protection**: CAPTCHA for users, OTP for admins
- **Audit Trail**: IP tracking and activity logging

## 🚀 Deployment

Deploy to Vercel:
```bash
npm i -g vercel
vercel --prod
```

Configure environment variables in your deployment platform.

## 🛠️ Troubleshooting

**Common Issues:**
- **CAPTCHA not loading**: Check reCAPTCHA keys and domain registration
- **File uploads fail**: Verify AWS credentials and encryption key (32 chars)
- **Email issues**: Confirm Gmail app password and check spam folderslt system with encryption, sharing capabilities, and admin analytics. Built with Node.js, MongoDB, and AWS S3.

## ✨ Features

- **🛡️ Security**: AES-256-CBC encryption, JWT authentication, role-based access
- **📁 File Management**: Secure cloud storage with S3, file persistence, smart expiration
- **🤝 Sharing**: User-to-user file sharing with permissions and revokable access
- **📊 Analytics**: Real-time dashboard, user management, system monitoring
- **🔐 Authentication**: CAPTCHA for users, OTP for admins

## 🚀 Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: MongoDB
- **Storage**: AWS S3
- **Security**: JWT, bcrypt, reCAPTCHA
- **Email**: Nodemailer

## 🛠️ Setup

### Prerequisites
- Node.js (v14+)
- MongoDB
- AWS S3 bucket
- Gmail account
- Google reCAPTCHA keys

### Installation

1. **Clone and install**
```bash
git clone https://github.com/Krisshhh/Vaultify.git
cd Vaultify
npm install
```

2. **Environment Setup**
Create `.env` file:
```env
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
ENCRYPTION_KEY=your_32_character_encryption_key
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_BUCKET_NAME=your_s3_bucket
AWS_REGION=your_aws_region
EMAIL_USER=your_gmail@gmail.com
EMAIL_PASS=your_gmail_app_password
CAPTCHA_SITE_KEY=your_recaptcha_site_key
CAPTCHA_SECRET_KEY=your_recaptcha_secret_key
```

3. **reCAPTCHA Setup**
- Visit [Google reCAPTCHA](https://www.google.com/recaptcha/admin/create)
- Create reCAPTCHA v2 site
- Add your domains and copy keys to `.env`

4. **Start Server**
```bash
npm start
```

Visit `http://localhost:5000`

## � Admin Setup

Create admin user in MongoDB:
```javascript
db.users.updateOne(
  { email: "admin@yourdomain.com" },
  { $set: { role: "admin" } }
)
```

## 📄 License

This project is licensed under the ISC License - see the package.json file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📞 Support

For support and questions:
- Create an issue on GitHub
- Check the troubleshooting section
- Review the setup instructions

---
