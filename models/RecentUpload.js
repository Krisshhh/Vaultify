const mongoose = require('mongoose');

const recentUploadSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  originalName: String,
  size: Number
}, { timestamps: true });

module.exports = mongoose.model('RecentUpload', recentUploadSchema);