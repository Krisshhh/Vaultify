const mongoose = require('mongoose');

const fileShareSchema = new mongoose.Schema({
  fileId: { type: mongoose.Schema.Types.ObjectId, ref: 'File', required: true },
  sharedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  sharedWith: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  shareToken: { type: String, required: true },
  permissions: {
    canDownload: { type: Boolean, default: true },
    canView: { type: Boolean, default: true }
  },
  shareType: { 
    type: String, 
    enum: ['user', 'qr', 'both'], 
    default: 'user' 
  },
  qrCode: {
    enabled: { type: Boolean, default: false },
    data: { type: String }, // Base64 encoded QR code image
    accessCount: { type: Number, default: 0 },
    maxAccess: { type: Number }, // Optional limit for QR access
    isPublic: { type: Boolean, default: false }
  },
  expiresAt: { type: Date },
  isActive: { type: Boolean, default: true },
  downloadCount: { type: Number, default: 0 },
  lastAccessed: { type: Date },
  createdAt: { type: Date, default: Date.now }
});

// Create indexes explicitly to avoid duplicates
fileShareSchema.index({ shareToken: 1 }, { unique: true });
fileShareSchema.index({ sharedWith: 1, isActive: 1 });
fileShareSchema.index({ sharedBy: 1 });

module.exports = mongoose.model('FileShare', fileShareSchema);
