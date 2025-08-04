const FileShare = require('../models/FileShare');
const File = require('../models/File');
const User = require('../models/User');
const Analytics = require('../models/Analytics');
const crypto = require('crypto');

// Share a file with another user
exports.shareFile = async (req, res) => {
  try {
    console.log('Share file request:', {
      body: req.body,
      user: req.user,
      headers: req.headers
    });
    
    const { fileId, sharedWithEmail, permissions, expiresIn } = req.body;
    const sharedById = req.user.id;

    // Check if file exists and belongs to the user
    const file = await File.findOne({ _id: fileId, user: sharedById });
    if (!file) {
      return res.status(404).json({ message: 'File not found or unauthorized' });
    }

    // Find user to share with
    const sharedWithUser = await User.findOne({ email: sharedWithEmail });
    if (!sharedWithUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Generate unique share token
    const shareToken = crypto.randomBytes(32).toString('hex');

    // Calculate expiration date
    let expiresAt = null;
    if (expiresIn) {
      expiresAt = new Date(Date.now() + expiresIn * 24 * 60 * 60 * 1000); // days to milliseconds
    }

    // Create file share record
    const fileShare = await FileShare.create({
      fileId,
      sharedBy: sharedById,
      sharedWith: sharedWithUser._id,
      shareToken,
      permissions: permissions || { canDownload: true, canView: true },
      expiresAt
    });

    // Track analytics
    await Analytics.create({
      userId: sharedById,
      eventType: 'file_share',
      fileId,
      shareId: fileShare._id,
      metadata: {
        fileSize: file.size,
        fileType: file.mimetype,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }
    });

    res.status(201).json({
      message: 'File shared successfully',
      shareToken,
      shareUrl: `${req.protocol}://${req.get('host')}/api/share/view/${shareToken}`
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to share file', error: err.message });
  }
};

// Get shared files for logged-in user
exports.getSharedFiles = async (req, res) => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const sharedFiles = await FileShare.find({ 
      sharedWith: userId, 
      isActive: true,
      $or: [
        { expiresAt: null },
        { expiresAt: { $gt: new Date() } }
      ]
    })
    .populate('fileId', 'originalName size mimetype uploadDate')
    .populate('sharedBy', 'username email')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

    const total = await FileShare.countDocuments({ 
      sharedWith: userId, 
      isActive: true,
      $or: [
        { expiresAt: null },
        { expiresAt: { $gt: new Date() } }
      ]
    });

    res.json({
      sharedFiles,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch shared files', error: err.message });
  }
};

// Get files shared by logged-in user
exports.getMySharedFiles = async (req, res) => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const mySharedFiles = await FileShare.find({ 
      sharedBy: userId, 
      isActive: true 
    })
    .populate('fileId', 'originalName size mimetype uploadDate')
    .populate('sharedWith', 'username email')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

    const total = await FileShare.countDocuments({ 
      sharedBy: userId, 
      isActive: true 
    });

    res.json({
      mySharedFiles,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch my shared files', error: err.message });
  }
};

// Access shared file via token
exports.accessSharedFile = async (req, res) => {
  try {
    const { token } = req.params;

    const fileShare = await FileShare.findOne({ 
      shareToken: token, 
      isActive: true,
      $or: [
        { expiresAt: null },
        { expiresAt: { $gt: new Date() } }
      ]
    })
    .populate('fileId')
    .populate('sharedBy', 'username email');

    if (!fileShare) {
      return res.status(404).json({ message: 'Invalid or expired share link' });
    }

    // Update last accessed
    fileShare.lastAccessed = new Date();
    await fileShare.save();

    res.json({
      file: {
        id: fileShare.fileId._id,
        filename: fileShare.fileId.originalName,
        size: fileShare.fileId.size,
        mimetype: fileShare.fileId.mimetype,
        uploadDate: fileShare.fileId.uploadDate
      },
      sharedBy: fileShare.sharedBy,
      permissions: fileShare.permissions,
      shareToken: token
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to access shared file', error: err.message });
  }
};

// Download shared file
exports.downloadSharedFile = async (req, res) => {
  try {
    const { token } = req.params;
    const crypto = require('crypto');
    const { getFile } = require('../utils/s3Service');

    const fileShare = await FileShare.findOne({ 
      shareToken: token, 
      isActive: true,
      $or: [
        { expiresAt: null },
        { expiresAt: { $gt: new Date() } }
      ]
    }).populate('fileId');

    if (!fileShare) {
      return res.status(404).json({ message: 'Invalid or expired share link' });
    }

    if (!fileShare.permissions.canDownload) {
      return res.status(403).json({ message: 'Download not permitted' });
    }

    const fileDoc = fileShare.fileId;
    
    if (!fileDoc) {
      return res.status(404).json({ message: 'File not found' });
    }

    // Update download count
    fileShare.downloadCount += 1;
    fileShare.lastAccessed = new Date();
    await fileShare.save();

    try {
      // Get file from S3
      const { Body: fileStream } = await getFile(fileDoc.encryptedName);

      // Set response headers
      res.setHeader('Content-Disposition', `attachment; filename="${fileDoc.originalName}"`);
      res.setHeader('Content-Type', fileDoc.mimetype);

      // Decrypt and stream to client
      const chunks = [];
      for await (const chunk of fileStream) {
        chunks.push(chunk);
      }
      const encryptedBuffer = Buffer.concat(chunks);
      const iv = encryptedBuffer.slice(0, 16);
      const encryptedData = encryptedBuffer.slice(16);
      const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(process.env.ENCRYPTION_KEY), iv);

      const decrypted = Buffer.concat([decipher.update(encryptedData), decipher.final()]);
      
      // Track analytics
      await Analytics.create({
        userId: fileShare.sharedWith,
        eventType: 'file_download',
        fileId: fileShare.fileId._id,
        shareId: fileShare._id,
        metadata: {
          fileSize: fileShare.fileId.size,
          fileType: fileShare.fileId.mimetype,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent')
        }
      });
      
      res.send(decrypted);
    } catch (downloadError) {
      console.error('File download error:', downloadError);
      return res.status(500).json({ message: 'Failed to download file', error: downloadError.message });
    }
  } catch (err) {
    console.error('Shared file download error:', err);
    res.status(500).json({ message: 'Failed to download shared file', error: err.message });
  }
};

// Revoke file share
exports.revokeShare = async (req, res) => {
  try {
    const { shareId } = req.params;
    const userId = req.user.id;

    const fileShare = await FileShare.findOne({ 
      _id: shareId, 
      sharedBy: userId 
    });

    if (!fileShare) {
      return res.status(404).json({ message: 'Share not found or unauthorized' });
    }

    fileShare.isActive = false;
    await fileShare.save();

    res.json({ message: 'File share revoked successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to revoke share', error: err.message });
  }
};
