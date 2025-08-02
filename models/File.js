const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  originalName: { type: String, required: true },
  encryptedName: { type: String, required: true },
  mimetype: { type: String, required: true },
  size: { type: Number, required: true },
  downloadToken: { type: String, required: true, unique: true },
  uploadDate: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true }
}, { timestamps: true });

module.exports = mongoose.model('File', fileSchema);