const FileShare = require('../models/FileShare');
const File = require('../models/File');
const User = require('../models/User');
const Analytics = require('../models/Analytics');
const crypto = require('crypto');
const QRCode = require('qrcode');
const mongoose = require('mongoose');

// Helper functions for HTML rendering
function getFileIcon(mimetype) {
  if (mimetype.startsWith('image/')) return '🖼️';
  if (mimetype.startsWith('video/')) return '🎥';
  if (mimetype.startsWith('audio/')) return '🎵';
  if (mimetype.includes('pdf')) return '📄';
  if (mimetype.includes('word') || mimetype.includes('document')) return '📝';
  if (mimetype.includes('excel') || mimetype.includes('spreadsheet')) return '📊';
  if (mimetype.includes('powerpoint') || mimetype.includes('presentation')) return '📋';
  if (mimetype.includes('zip') || mimetype.includes('archive')) return '📦';
  if (mimetype.includes('text')) return '📄';
  return '📁';
}

function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Generate QR Code for file sharing
exports.generateQRCode = async (req, res) => {
  try {
    console.log('Generate QR Code request:', {
      body: req.body,
      user: req.user
    });
    
    const { fileId, expiresIn, maxAccess, isPublic, permissions } = req.body;
    const sharedById = req.user.id;

    // Validate required fields
    if (!fileId) {
      console.log('ERROR: fileId is missing');
      return res.status(400).json({ message: 'fileId is required' });
    }

    // Validate fileId format
    if (!mongoose.Types.ObjectId.isValid(fileId)) {
      console.log('ERROR: Invalid fileId format:', fileId);
      return res.status(400).json({ message: 'Invalid fileId format' });
    }

    console.log('Looking for file with ID:', fileId, 'for user:', sharedById);
    
    // Check if file exists and belongs to the user
    const file = await File.findOne({ _id: fileId, user: sharedById });
    console.log('File found:', !!file);
    
    if (!file) {
      console.log('ERROR: File not found or unauthorized');
      return res.status(404).json({ message: 'File not found or unauthorized' });
    }

    console.log('File details:', { name: file.originalName, id: file._id });

    // Generate unique share token for QR code
    const shareToken = crypto.randomBytes(32).toString('hex');
    console.log('Generated shareToken:', shareToken);

    // Calculate expiration date
    let expiresAt = null;
    if (expiresIn) {
      expiresAt = new Date(Date.now() + expiresIn * 24 * 60 * 60 * 1000);
    }
    console.log('ExpiresAt:', expiresAt);

    // Create share URL
    const shareUrl = `${req.protocol}://${req.get('host')}/api/share/qr/${shareToken}`;
    console.log('Share URL:', shareUrl);

    // Generate QR code
    console.log('Generating QR code...');
    const qrCodeData = await QRCode.toDataURL(shareUrl, {
      errorCorrectionLevel: 'M',
      type: 'image/png',
      quality: 0.92,
      margin: 1,
      width: 256,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
    console.log('QR code generated successfully, length:', qrCodeData.length);

    // Create file share record with QR code
    console.log('Creating FileShare record...');
    const shareData = {
      fileId,
      sharedBy: sharedById,
      shareToken,
      shareType: 'qr',
      permissions: permissions || { canDownload: true, canView: true },
      qrCode: {
        enabled: true,
        data: qrCodeData,
        accessCount: 0,
        maxAccess: maxAccess || null,
        isPublic: isPublic || false
      },
      expiresAt
    };
    
    console.log('Share data to create:', JSON.stringify(shareData, null, 2));
    
    const fileShare = await FileShare.create(shareData);
    console.log('FileShare created successfully:', fileShare._id);

    // Track analytics
    console.log('Creating analytics...');
    await Analytics.create({
      userId: sharedById,
      eventType: 'qr_code_generated',
      fileId,
      shareId: fileShare._id,
      metadata: {
        fileSize: file.size,
        fileType: file.mimetype,
        isPublic: isPublic || false,
        maxAccess: maxAccess || 'unlimited',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }
    });

    console.log('Sending response...');
    res.status(201).json({
      message: 'QR code generated successfully',
      shareId: fileShare._id,
      shareToken,
      shareUrl,
      qrShareUrl: shareUrl,
      qrCode: qrCodeData,
      expiresAt,
      maxAccess: maxAccess || 'unlimited'
    });
  } catch (err) {
    console.error('QR code generation error:', err);
    console.error('Error stack:', err.stack);
    res.status(500).json({ message: 'Failed to generate QR code', error: err.message });
  }
};

// Share a file with another user
exports.shareFile = async (req, res) => {
  try {
    console.log('Share file request:', {
      body: req.body,
      user: req.user,
      headers: req.headers
    });
    
    const { fileId, sharedWithEmail, permissions, expiresIn, generateQR, maxAccess, isPublic } = req.body;
    const sharedById = req.user.id;

    // Check if file exists and belongs to the user
    const file = await File.findOne({ _id: fileId, user: sharedById });
    if (!file) {
      return res.status(404).json({ message: 'File not found or unauthorized' });
    }

    // Generate unique share token
    const shareToken = crypto.randomBytes(32).toString('hex');

    // Calculate expiration date
    let expiresAt = null;
    if (expiresIn) {
      expiresAt = new Date(Date.now() + expiresIn * 24 * 60 * 60 * 1000); // days to milliseconds
    }

    let shareData = {
      fileId,
      sharedBy: sharedById,
      shareToken,
      permissions: permissions || { canDownload: true, canView: true },
      expiresAt
    };

    // Determine share type and handle accordingly
    if (generateQR && sharedWithEmail) {
      // Both user sharing and QR code
      const sharedWithUser = await User.findOne({ email: sharedWithEmail });
      if (!sharedWithUser) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      shareData.sharedWith = sharedWithUser._id;
      shareData.shareType = 'both';
      
      // Generate QR code
      const shareUrl = `${req.protocol}://${req.get('host')}/api/share/qr/${shareToken}`;
      const qrCodeData = await QRCode.toDataURL(shareUrl, {
        errorCorrectionLevel: 'M',
        type: 'image/png',
        quality: 0.92,
        margin: 1,
        width: 256,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      
      shareData.qrCode = {
        enabled: true,
        data: qrCodeData,
        accessCount: 0,
        maxAccess: maxAccess || null,
        isPublic: isPublic || false
      };
    } else if (generateQR) {
      // QR code only
      shareData.shareType = 'qr';
      
      const shareUrl = `${req.protocol}://${req.get('host')}/api/share/qr/${shareToken}`;
      const qrCodeData = await QRCode.toDataURL(shareUrl, {
        errorCorrectionLevel: 'M',
        type: 'image/png',
        quality: 0.92,
        margin: 1,
        width: 256,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      
      shareData.qrCode = {
        enabled: true,
        data: qrCodeData,
        accessCount: 0,
        maxAccess: maxAccess || null,
        isPublic: isPublic || false
      };
    } else if (sharedWithEmail) {
      // User sharing only
      const sharedWithUser = await User.findOne({ email: sharedWithEmail });
      if (!sharedWithUser) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      shareData.sharedWith = sharedWithUser._id;
      shareData.shareType = 'user';
    } else {
      return res.status(400).json({ message: 'Either sharedWithEmail or generateQR must be provided' });
    }

    // Create file share record
    const fileShare = await FileShare.create(shareData);

    // Track analytics
    await Analytics.create({
      userId: sharedById,
      eventType: generateQR ? 'file_share_with_qr' : 'file_share',
      fileId,
      shareId: fileShare._id,
      metadata: {
        fileSize: file.size,
        fileType: file.mimetype,
        shareType: shareData.shareType,
        hasQR: !!generateQR,
        isPublic: isPublic || false,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }
    });

    const response = {
      message: 'File shared successfully',
      shareToken,
      shareUrl: `${req.protocol}://${req.get('host')}/api/share/view/${shareToken}`,
      shareType: shareData.shareType
    };

    // Add QR code data if generated
    if (generateQR && shareData.qrCode) {
      response.qrCode = shareData.qrCode.data;
      response.qrShareUrl = `${req.protocol}://${req.get('host')}/api/share/qr/${shareToken}`;
    }

    res.status(201).json(response);
  } catch (err) {
    console.error('Share file error:', err);
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

// Access shared file via QR code token
exports.accessQRSharedFile = async (req, res) => {
  try {
    const { token } = req.params;

    const fileShare = await FileShare.findOne({ 
      shareToken: token, 
      isActive: true,
      shareType: { $in: ['qr', 'both'] },
      'qrCode.enabled': true,
      $or: [
        { expiresAt: null },
        { expiresAt: { $gt: new Date() } }
      ]
    })
    .populate('fileId')
    .populate('sharedBy', 'username email');

    if (!fileShare) {
      // Check if this is a browser request (HTML page)
      const acceptHeader = req.get('Accept') || '';
      if (acceptHeader.includes('text/html')) {
        return res.status(404).send(`
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>File Not Found - Vaultify</title>
            <link rel="stylesheet" href="/style.css">
          </head>
          <body class="with-navbar">
            <header class="main-header">
                <nav class="navbar">
                    <div class="navbar-brand">
                        <a href="/">Vaultify</a>
                    </div>
                    <div class="navbar-center">
                        <ul class="navbar-menu">
                            <li><a href="/">Home</a></li>
                            <li><a href="/login.html">Login</a></li>
                        </ul>
                    </div>
                    <div class="navbar-right">
                        <a href="/signup.html" class="btn btn-primary btn-small">Sign Up</a>
                    </div>
                    <button class="navbar-toggle" aria-label="Toggle Navigation">
                        <span class="toggle-icon"></span>
                        <span class="toggle-icon"></span>
                        <span class="toggle-icon"></span>
                    </button>
                </nav>
            </header>
            <main class="container">
              <div class="qr-error-page">
                <h1>🔐 Vaultify</h1>
                <div class="qr-error-content">
                  <h3>❌ File Not Found</h3>
                  <p>This QR code link is invalid or has expired.</p>
                  <p>Please check with the person who shared the file.</p>
                </div>
                <a href="/" class="btn btn-primary">Go to Home</a>
              </div>
            </main>
          </body>
          </html>
        `);
      }
      return res.status(404).json({ message: 'Invalid or expired QR share link' });
    }

    // Check access limits
    if (fileShare.qrCode.maxAccess && fileShare.qrCode.accessCount >= fileShare.qrCode.maxAccess) {
      const acceptHeader = req.get('Accept') || '';
      if (acceptHeader.includes('text/html')) {
        return res.status(403).send(`
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Access Limit Exceeded - Vaultify</title>
            <link rel="stylesheet" href="/style.css">
          </head>
          <body class="with-navbar">
            <header class="main-header">
                <nav class="navbar">
                    <div class="navbar-brand">
                        <a href="/">Vaultify</a>
                    </div>
                    <div class="navbar-center">
                        <ul class="navbar-menu">
                            <li><a href="/">Home</a></li>
                            <li><a href="/login.html">Login</a></li>
                        </ul>
                    </div>
                    <div class="navbar-right">
                        <a href="/signup.html" class="btn btn-primary btn-small">Sign Up</a>
                    </div>
                    <button class="navbar-toggle" aria-label="Toggle Navigation">
                        <span class="toggle-icon"></span>
                        <span class="toggle-icon"></span>
                        <span class="toggle-icon"></span>
                    </button>
                </nav>
            </header>
            <main class="container">
              <div class="qr-error-page">
                <h1>🔐 Vaultify</h1>
                <div class="qr-warning-content">
                  <h3>⚠️ Access Limit Exceeded</h3>
                  <p>This QR code has reached its maximum access limit.</p>
                  <p>Please contact the person who shared the file for a new link.</p>
                </div>
                <a href="/" class="btn btn-primary">Go to Home</a>
              </div>
            </main>
          </body>
          </html>
        `);
      }
      return res.status(403).json({ message: 'Access limit exceeded for this QR code' });
    }

    // Check if this is a browser request (HTML page)
    const acceptHeader = req.get('Accept') || '';
    if (acceptHeader.includes('text/html')) {
      // Serve the QR access HTML page with proper styling
      return res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Secure File Access - Vaultify</title>
            <link rel="stylesheet" href="/style.css">
        </head>
        <body class="with-navbar">
            <header class="main-header">
                <nav class="navbar">
                    <div class="navbar-brand">
                        <a href="/">Vaultify</a>
                    </div>
                    <div class="navbar-center">
                        <ul class="navbar-menu">
                            <li><a href="/">Home</a></li>
                            <li><a href="/login.html">Login</a></li>
                        </ul>
                    </div>
                    <div class="navbar-right">
                        <a href="/signup.html" class="btn btn-primary btn-small">Sign Up</a>
                    </div>
                    <button class="navbar-toggle" aria-label="Toggle Navigation">
                        <span class="toggle-icon"></span>
                        <span class="toggle-icon"></span>
                        <span class="toggle-icon"></span>
                    </button>
                </nav>
            </header>

            <main class="container">
                <div class="qr-access-container">
                    <div class="qr-access-content">
                        <div class="qr-access-header">
                            <span class="qr-file-icon">${getFileIcon(fileShare.fileId.mimetype)}</span>
                            <h1>File Download</h1>
                        </div>
                        
                        <div class="qr-access-body">
                            <div class="qr-file-details">
                                <div class="qr-detail-row">
                                    <span class="qr-detail-label">Filename:</span>
                                    <span class="qr-detail-value">${fileShare.fileId.originalName}</span>
                                </div>
                                <div class="qr-detail-row">
                                    <span class="qr-detail-label">Size:</span>
                                    <span class="qr-detail-value">${formatFileSize(fileShare.fileId.size)}</span>
                                </div>

                                <div class="qr-detail-row">
                                    <span class="qr-detail-label">Uploaded:</span>
                                    <span class="qr-detail-value">${new Date(fileShare.fileId.uploadDate).toLocaleString()}</span>
                                </div>
                            </div>

                            <div class="qr-shared-by">
                                <h4>� Shared by</h4>
                                <p><strong>${fileShare.sharedBy.username}</strong></p>
                                <p>${fileShare.sharedBy.email}</p>
                            </div>



                            <div class="qr-download-section">
                                ${fileShare.permissions.canDownload ? 
                                    `<a href="/api/share/download/${token}" class="qr-download-btn">
                                        <span>📥</span> Download File
                                     </a>` : 
                                    '<p style="color: #ef4444;">❌ Download not available</p>'
                                }
                            </div>
                        </div>
                        
                        <div class="qr-powered-by">
                            <p>🔐 Secured by Vaultify</p>
                        </div>
                    </div>
                </div>
            </main>

            <script>
                // Mobile navbar toggle
                const toggleButton = document.querySelector('.navbar-toggle');
                const navbarMenu = document.querySelector('.navbar-menu');

                if (toggleButton && navbarMenu) {
                    toggleButton.addEventListener('click', () => {
                        navbarMenu.classList.toggle('active');
                    });

                    // Close mobile menu when clicking outside
                    document.addEventListener('click', (e) => {
                        if (!toggleButton.contains(e.target) && !navbarMenu.contains(e.target)) {
                            navbarMenu.classList.remove('active');
                        }
                    });
                }
            </script>
        </body>
        </html>
      `);
    }

    // Update access count and last accessed
    fileShare.qrCode.accessCount += 1;
    fileShare.lastAccessed = new Date();
    await fileShare.save();

    // Track analytics
    await Analytics.create({
      eventType: 'qr_code_access',
      fileId: fileShare.fileId._id,
      shareId: fileShare._id,
      metadata: {
        fileSize: fileShare.fileId.size,
        fileType: fileShare.fileId.mimetype,
        accessCount: fileShare.qrCode.accessCount,
        maxAccess: fileShare.qrCode.maxAccess,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }
    });

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
      shareToken: token,
      shareType: 'qr',
      accessInfo: {
        currentAccess: fileShare.qrCode.accessCount,
        maxAccess: fileShare.qrCode.maxAccess || 'unlimited',
        isPublic: fileShare.qrCode.isPublic
      }
    });
  } catch (err) {
    console.error('QR access error:', err);
    res.status(500).json({ message: 'Failed to access QR shared file', error: err.message });
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

    // Transform data to include QR code information
    const transformedFiles = mySharedFiles.map(share => {
      const shareObj = share.toObject();
      
      // Include QR code data if available
      if (shareObj.shareType === 'qr' || shareObj.shareType === 'both') {
        shareObj.qrInfo = {
          hasQR: true,
          accessCount: shareObj.qrCode?.accessCount || 0,
          maxAccess: shareObj.qrCode?.maxAccess || 'unlimited',
          isPublic: shareObj.qrCode?.isPublic || false,
          qrCodeData: shareObj.qrCode?.data // Include QR code image data
        };
      } else {
        shareObj.qrInfo = { hasQR: false };
      }
      
      return shareObj;
    });

    res.json({
      mySharedFiles: transformedFiles,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (err) {
    console.error('Get my shared files error:', err);
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

    // For QR code shares, check access limits
    if ((fileShare.shareType === 'qr' || fileShare.shareType === 'both') && fileShare.qrCode.enabled) {
      if (fileShare.qrCode.maxAccess && fileShare.qrCode.accessCount >= fileShare.qrCode.maxAccess) {
        return res.status(403).json({ message: 'Access limit exceeded for this QR code' });
      }
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
    
    // Update QR access count if applicable
    if ((fileShare.shareType === 'qr' || fileShare.shareType === 'both') && fileShare.qrCode.enabled) {
      fileShare.qrCode.accessCount += 1;
    }
    
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
      
      // Track analytics with share type
      await Analytics.create({
        userId: fileShare.sharedWith,
        eventType: fileShare.shareType === 'qr' ? 'qr_file_download' : 'file_download',
        fileId: fileShare.fileId._id,
        shareId: fileShare._id,
        metadata: {
          fileSize: fileShare.fileId.size,
          fileType: fileShare.fileId.mimetype,
          shareType: fileShare.shareType,
          qrAccessCount: fileShare.qrCode?.accessCount || 0,
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

// Get QR code details for a shared file
exports.getQRCodeDetails = async (req, res) => {
  try {
    const { shareId } = req.params;
    const userId = req.user.id;

    const fileShare = await FileShare.findOne({
      _id: shareId,
      sharedBy: userId,
      isActive: true,
      shareType: { $in: ['qr', 'both'] },
      'qrCode.enabled': true
    })
    .populate('fileId', 'originalName size mimetype uploadDate');

    if (!fileShare) {
      return res.status(404).json({ message: 'QR code share not found or unauthorized' });
    }

    res.json({
      shareId: fileShare._id,
      file: {
        id: fileShare.fileId._id,
        filename: fileShare.fileId.originalName,
        size: fileShare.fileId.size,
        mimetype: fileShare.fileId.mimetype,
        uploadDate: fileShare.fileId.uploadDate
      },
      qrCode: fileShare.qrCode.data,
      shareUrl: `${req.protocol}://${req.get('host')}/api/share/qr/${fileShare.shareToken}`,
      accessInfo: {
        currentAccess: fileShare.qrCode.accessCount,
        maxAccess: fileShare.qrCode.maxAccess || 'unlimited',
        isPublic: fileShare.qrCode.isPublic
      },
      permissions: fileShare.permissions,
      expiresAt: fileShare.expiresAt,
      createdAt: fileShare.createdAt
    });
  } catch (err) {
    console.error('Get QR code details error:', err);
    res.status(500).json({ message: 'Failed to get QR code details', error: err.message });
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
