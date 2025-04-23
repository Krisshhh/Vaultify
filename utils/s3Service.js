const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { defaultProvider } = require('@aws-sdk/credential-provider-node');

// Create the S3 client instance
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: defaultProvider({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }),
  forcePathStyle: false,
  maxAttempts: 3
});

// Upload file to S3
const uploadFile = async (fileBuffer, fileName, mimetype) => {
  const uploadParams = {
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: fileName,
    Body: fileBuffer,
    ContentType: mimetype
  };
  return s3Client.send(new PutObjectCommand(uploadParams));
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