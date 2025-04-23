const crypto = require('crypto');
const File = require('../models/File');
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
  try {
    const file = req.file;
    const userId = req.user?.id || null;
    const secretKey = process.env.ENCRYPTION_KEY;

    if (!file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    if (!secretKey || secretKey.length !== 32) {
      return res.status(500).json({ message: 'Invalid or missing ENCRYPTION_KEY in .env (must be 32 chars)' });
    }

    const encryptedBuffer = await encryptFileInMemory(file.buffer, secretKey);
    const encryptedFilename = `enc-${crypto.randomUUID()}-${file.originalname}`;

    console.log('Uploading to S3:', {
      bucket: process.env.AWS_BUCKET_NAME,
      key: encryptedFilename,
      size: encryptedBuffer.length
    });

    await uploadFile(encryptedBuffer, encryptedFilename, file.mimetype);

    const fileDoc = new File({
      user: userId,
      originalName: file.originalname,
      encryptedName: encryptedFilename,
      mimetype: file.mimetype,
      size: file.size,
      downloadToken: crypto.randomUUID(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours expiry
    });

    await fileDoc.save();

    res.status(200).json({
      message: 'File uploaded & encrypted successfully',
      downloadLink: `/api/files/download/${fileDoc.downloadToken}`
    });

  } catch (error) {
    console.error('Upload Error:', {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    res.status(500).json({ 
      message: 'Upload failed',
      error: error.message
    });
  }
};

// Download + Decrypt Controller
exports.downloadFile = async (req, res) => {
  try {
    const { token } = req.params;
    const fileDoc = await File.findOne({ downloadToken: token });

    if (!fileDoc) {
      return res.status(404).json({ message: 'File not found' });
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
    res.send(decrypted);

    // Clean up
    await File.deleteOne({ _id: fileDoc._id });
    await deleteFile(fileDoc.encryptedName);

  } catch (error) {
    console.error('Download Error:', {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    res.status(500).json({ 
      message: 'Download failed',
      error: error.message
    });
  }
};