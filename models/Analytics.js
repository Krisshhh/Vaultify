const mongoose = require('mongoose');

const analyticsSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  eventType: { 
    type: String, 
    enum: [
      'file_upload', 
      'file_download', 
      'file_share', 
      'user_login', 
      'user_signup', 
      'file_delete',
      'qr_code_generated',
      'qr_code_access',
      'qr_file_download',
      'file_share_with_qr'
    ],
    required: true 
  },
  fileId: { type: mongoose.Schema.Types.ObjectId, ref: 'File' },
  shareId: { type: mongoose.Schema.Types.ObjectId, ref: 'FileShare' },
  metadata: {
    fileSize: Number,
    fileType: String,
    ipAddress: String,
    userAgent: String,
    downloadDuration: Number,
    shareType: String,
    isPublic: Boolean,
    maxAccess: mongoose.Schema.Types.Mixed,
    accessCount: Number,
    hasQR: Boolean,
    qrAccessCount: Number
  },
  timestamp: { type: Date, default: Date.now }
});

analyticsSchema.index({ eventType: 1, timestamp: -1 });
analyticsSchema.index({ userId: 1, timestamp: -1 });
analyticsSchema.index({ timestamp: -1 });

module.exports = mongoose.model('Analytics', analyticsSchema);
