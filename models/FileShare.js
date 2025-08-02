const mongoose = require('mongoose');

const fileShareSchema = new mongoose.Schema({
  fileId: { type: mongoose.Schema.Types.ObjectId, ref: 'File', required: true },
  sharedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  sharedWith: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  shareToken: { type: String, required: true, unique: true },
  permissions: {
    canDownload: { type: Boolean, default: true },
    canView: { type: Boolean, default: true }
  },
  expiresAt: { type: Date },
  isActive: { type: Boolean, default: true },
  downloadCount: { type: Number, default: 0 },
  lastAccessed: { type: Date },
  createdAt: { type: Date, default: Date.now }
});

fileShareSchema.index({ shareToken: 1 });
fileShareSchema.index({ sharedWith: 1, isActive: 1 });
fileShareSchema.index({ sharedBy: 1 });

module.exports = mongoose.model('FileShare', fileShareSchema);
