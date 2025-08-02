const express = require('express');
const fileRoutes = require('./routes/fileRoutes');
const authRoutes = require('./routes/authRoutes');
const shareRoutes = require('./routes/shareRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();

// Performance and security middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Enable trust proxy for accurate IP addresses
app.set('trust proxy', 1);

// Add response compression (if needed)
// app.use(require('compression')());

// Serve static files
app.use(express.static('public'));

// API Routes
app.use('/api/files', fileRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/share', shareRoutes);
app.use('/api/admin', adminRoutes);

module.exports = app;