const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

const app = express();

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.static('public'));

// Simple test route for file sharing API
app.post('/api/share/share', async (req, res) => {
  try {
    console.log('Share request received:', req.body);
    
    // For now, just return a success response
    res.status(201).json({
      message: 'File shared successfully (test mode)',
      shareToken: 'test-token-123',
      shareUrl: `${req.protocol}://${req.get('host')}/api/share/view/test-token-123`
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to share file', error: err.message });
  }
});

// Simple route for testing
app.get('/api/test', (req, res) => {
  res.json({ message: 'Server is working!' });
});

// DB Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('DB Connection Error:', err));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Test server running on http://localhost:${PORT}`);
  console.log('Try accessing: http://localhost:5000/api/test');
});
