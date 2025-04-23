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
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(secretKey), iv);
    
    let encrypted = Buffer.concat([iv]);
    cipher.on('data', (chunk) => encrypted = Buffer.concat([encrypted, chunk]));
    cipher.on('end', () => resolve(encrypted));
    cipher.on('error', reject);
    
    cipher.write(buffer);
    cipher.end();
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