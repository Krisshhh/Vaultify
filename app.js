const express = require('express');
const fileRoutes = require('./routes/fileRoutes');
const authRoutes = require('./routes/authRoutes');

const app = express();
app.use(express.json());
app.use('/api/files', fileRoutes);
app.use('/api/auth', authRoutes);

module.exports = app;