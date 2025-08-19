const crypto = require('crypto');
const File = require('../models/File');
const RecentUpload = require('../models/RecentUpload');
const Analytics = require('../models/Analytics');

const { 
  encryptFileInMemory 
} = require('../utils/encryptor');
const { 
  uploadFile, 
  getFile, 
  deleteFile 
} = require('../utils/s3Service');

// Upload + Encrypt Controller
exports.uploadFile = async (req, res) => {
  const startTime = Date.now();
  
  try {
    // Set response timeout for Vercel
    req.setTimeout(55000); // 55 seconds (Vercel limit is 60s for pro)

    const file = req.file;
    const userId = req.user?.id || null;
    const secretKey = process.env.ENCRYPTION_KEY;

    if (!file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    if (!secretKey || secretKey.length !== 32) {
      return res.status(500).json({ message: 'Server configuration error' });
    }

    // Check AWS configuration
    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY || !process.env.AWS_BUCKET_NAME) {
      return res.status(500).json({ message: 'Server configuration error' });
    }

    const encryptedBuffer = await encryptFileInMemory(file.buffer, secretKey);
    const encryptedFilename = `enc-${crypto.randomUUID()}-${file.originalname}`;

    // Upload to S3 with error handling
    await uploadFile(encryptedBuffer, encryptedFilename, file.mimetype);

    const fileDoc = new File({
      user: userId,
      originalName: file.originalname,
      encryptedName: encryptedFilename,
      mimetype: file.mimetype,
      size: file.size,
      downloadToken: crypto.randomUUID(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
    });

    await fileDoc.save();

    // Track upload analytics (with error handling)
    try {
      await Analytics.create({
        userId: req.user.id,
        eventType: 'file_upload',
        fileId: fileDoc._id,
        metadata: {
          fileSize: file.size,
          fileType: file.mimetype,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent')
        }
      });
    } catch (analyticsError) {
      console.warn('Analytics tracking failed:', analyticsError.message);
    }

    // Track recent uploads (with error handling)
    try {
      await RecentUpload.create({
        user: req.user.id,
        originalName: req.file.originalname,
        size: Math.ceil(req.file.size / 1024) 
      });
      
      const recent = await RecentUpload.find({ user: req.user.id })
        .sort({ createdAt: -1 })
        .skip(5);

      if (recent.length > 0) {
        const idsToDelete = recent.map(doc => doc._id);
        await RecentUpload.deleteMany({ _id: { $in: idsToDelete } });
      }
    } catch (recentUploadError) {
      console.warn('Recent upload tracking failed:', recentUploadError.message);
    }
    

    res.status(200).json({
      message: 'File uploaded & encrypted successfully',
      downloadLink: `/api/files/download/${fileDoc.downloadToken}`,
      file: {
        id: fileDoc._id,
        originalName: fileDoc.originalName,
        size: fileDoc.size,
        mimetype: fileDoc.mimetype,
        downloadToken: fileDoc.downloadToken
      }
    });
    
  } catch (error) {
    console.error('Upload Error:', {
      message: error.message,
      timestamp: new Date().toISOString()
    });
    res.status(500).json({ 
      message: 'Upload failed'
    });
  }
};

// Download + Decrypt Controller
exports.downloadFile = async (req, res) => {
  try {
    const { token } = req.params;
    const fileDoc = await File.findOne({ downloadToken: token });

    if (!fileDoc) {
      return res.status(404).json({ message: 'File not found or expired' });
    }

    if (fileDoc.expiresAt < new Date()) {
      await File.deleteOne({ _id: fileDoc._id });
      return res.status(410).json({ message: 'Download link expired' });
    }

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
    
    // Track download analytics
    await Analytics.create({
      userId: fileDoc.user,
      eventType: 'file_download',
      fileId: fileDoc._id,
      metadata: {
        fileSize: fileDoc.size,
        fileType: fileDoc.mimetype,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }
    });
    
    res.send(decrypted);

    // Note: Files are not deleted after download to maintain file vault functionality
    // Only expired files are cleaned up by a separate process

  } catch (error) {
    console.error('Download Error:', {
      message: error.message,
      timestamp: new Date().toISOString()
    });
    res.status(500).json({ 
      message: 'Download failed'
    });
  }
};

exports.getUserDashboard = async (req, res) => {
  try {
    const userId = req.user.id;

    const recentFiles = await RecentUpload.find({ user: userId })
      .sort({ createdAt: -1 });

    const totalFiles = recentFiles.length;
    const storageUsed = recentFiles.reduce((sum, f) => sum + (f.size || 0), 0);

    return res.json({
      totalFiles,
      storageUsed,
      recentFiles
    });

  } catch (err) {
    console.error("Dashboard error:", err);
    res.status(500).json({ message: "Failed to load dashboard" });
  }
};

// Get user's files
exports.getUserFiles = async (req, res) => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const files = await File.find({ user: userId })
      .sort({ uploadDate: -1 })
      .skip(skip)
      .limit(limit)
      .select('originalName size mimetype uploadDate downloadToken expiresAt');

    const total = await File.countDocuments({ user: userId });

    res.json({
      files,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (err) {
    console.error("Get user files error:", err);
    res.status(500).json({ message: "Failed to get user files" });
  }
};

// Delete user file
exports.deleteUserFile = async (req, res) => {
  try {
    const { fileId } = req.params;
    const userId = req.user.id;

    const file = await File.findOne({ _id: fileId, user: userId });
    if (!file) {
      return res.status(404).json({ message: 'File not found or unauthorized' });
    }

    // Delete from S3
    await deleteFile(file.encryptedName);

    // Delete from database
    await File.deleteOne({ _id: fileId });

    // Track deletion analytics
    await Analytics.create({
      userId,
      eventType: 'file_delete',
      fileId,
      metadata: {
        fileSize: file.size,
        fileType: file.mimetype,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }
    });

    res.json({ message: 'File deleted successfully' });
  } catch (err) {
    console.error("Delete file error:", err);
    res.status(500).json({ message: "Failed to delete file" });
  }
};
