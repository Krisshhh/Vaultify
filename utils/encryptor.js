const crypto = require('crypto');
const fs = require('fs'); // Add this missing import

function encryptFile(filePath, destinationPath, secretKey) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(secretKey), iv);

  const input = fs.createReadStream(filePath);
  const output = fs.createWriteStream(destinationPath);

  output.write(iv);
  input.pipe(cipher).pipe(output);
}

function encryptFileInMemory(buffer, secretKey) {
  return new Promise((resolve, reject) => {
    try {
      if (!buffer || !Buffer.isBuffer(buffer)) {
        reject(new Error('Invalid buffer provided for encryption'));
        return;
      }
      
      if (!secretKey || secretKey.length !== 32) {
        reject(new Error('Invalid secret key - must be 32 characters'));
        return;
      }
      
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(secretKey), iv);
      
      let encrypted = Buffer.concat([iv]);
      
      cipher.on('data', (chunk) => {
        encrypted = Buffer.concat([encrypted, chunk]);
      });
      
      cipher.on('end', () => {
        resolve(encrypted);
      });
      
      cipher.on('error', (error) => {
        console.error('Cipher error:', error);
        reject(error);
      });
      
      cipher.write(buffer);
      cipher.end();
    } catch (error) {
      console.error('Encryption setup error:', error);
      reject(error);
    }
  });
}

function decryptFile(inputPath, res, originalName, mimetype, secretKey) {
  const input = fs.createReadStream(inputPath);

  input.once('readable', () => {
    const iv = input.read(16);
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(secretKey), iv);

    res.setHeader('Content-Disposition', `attachment; filename="${originalName}"`);
    res.setHeader('Content-Type', mimetype);

    input.pipe(decipher).pipe(res);
  });
}

module.exports = {
  encryptFile,
  decryptFile,
  encryptFileInMemory
};