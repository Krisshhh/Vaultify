const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  },
  forcePathStyle: false,
  maxAttempts: 3
});

const uploadFile = async (fileBuffer, fileName, mimetype) => {
  const uploadStartTime = Date.now();
  
  try {
    //validating inputs
    if (!fileBuffer || fileBuffer.length === 0) {
      throw new Error('File buffer is empty or invalid');
    }
    if (!fileName || fileName.trim() === '') {
      throw new Error('File name is required');
    }
    if (!process.env.AWS_BUCKET_NAME) {
      throw new Error('AWS_BUCKET_NAME environment variable not set');
    }
    
    const uploadParams = {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: fileName,
      Body: fileBuffer,
      ContentType: mimetype || 'application/octet-stream'
    };
    
    const result = await s3Client.send(new PutObjectCommand(uploadParams));
    
    return result;
  } catch (error) {
    const uploadDuration = Date.now() - uploadStartTime;
    
    console.error('S3 upload failed:', {
      code: error.code,
      statusCode: error.$metadata?.httpStatusCode,
      duration: `${uploadDuration}ms`,
      timestamp: new Date().toISOString()
    });
    
    // Provide generic error messages without exposing sensitive details
    if (error.code === 'AccessDenied') {
      throw new Error('Storage access denied. Please contact support.');
    } else if (error.code === 'NoSuchBucket') {
      throw new Error('Storage configuration error. Please contact support.');
    } else if (error.code === 'NetworkingError') {
      throw new Error('Network error. Please try again.');
    } else if (error.code === 'InvalidAccessKeyId' || error.code === 'SignatureDoesNotMatch') {
      throw new Error('Storage authentication error. Please contact support.');
    } else if (error.code === 'RequestTimeout' || error.name === 'TimeoutError') {
      throw new Error('Upload timeout. Please try uploading a smaller file.');
    }
    
    // Generic error message for unknown errors
    throw new Error('Upload failed. Please try again or contact support.');
  }
};

// Get file from S3
const getFile = async (fileName) => {
  const params = {
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: fileName
  };
  return s3Client.send(new GetObjectCommand(params));
};

// Delete file from S3
const deleteFile = async (fileName) => {
  const params = {
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: fileName
  };
  return s3Client.send(new DeleteObjectCommand(params));
};

// Generate download URL
const getFileUrl = async (fileName) => {
  const params = {
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: fileName
  };
  return getSignedUrl(s3Client, new GetObjectCommand(params), { expiresIn: 3600 });
};

module.exports = {
  s3Client,
  uploadFile,
  getFile,
  deleteFile,
  getFileUrl
};