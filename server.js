const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const authRoutes = require('./routes/authRoutes');
const fileRoutes = require('./routes/fileRoutes');
const path = require('path');
const fs = require('fs');

dotenv.config();


// Add this debug check
// console.log('AWS Credential Verification:', {
//   accessKeyId: process.env.AWS_ACCESS_KEY_ID?.length ? 'PRESENT' : 'MISSING',
//   secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY?.length ? 'PRESENT' : 'MISSING',
//   region: process.env.AWS_REGION,
//   bucket: process.env.AWS_BUCKET_NAME
// });
// console.log('ENV TEST:', process.env.EMAIL_USER, process.env.EMAIL_PASS ? 'PASS FOUND' : 'MISSING');


const app = express();

// Middleware
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static('public'));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/files', fileRoutes);

// Ensure uploads folder exists
if (!fs.existsSync('./uploads')) {
  fs.mkdirSync('./uploads');
}

// DB & Server Start
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    app.listen(process.env.PORT, () =>
      console.log(`Server running on http://localhost:${process.env.PORT}`)
    );
  })
  .catch((err) => console.error('DB Connection Error:', err));
