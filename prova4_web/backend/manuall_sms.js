const crypto = require('crypto');
require('dotenv').config();

// Encryption algorithm and keys
const algorithm = 'aes-256-cbc';
const key = Buffer.from(process.env.ENCRYPTION_KEY, 'hex'); // Use a 32-byte hex key
const iv = Buffer.from('27350e590351004443591d50ef8fddbc', 'hex'); // Use a 16-byte hex IV

// Debug: Validate key and IV
console.log("Encryption Key:", process.env.ENCRYPTION_KEY);
console.log("Key (Buffer):", key);
console.log("Key Length:", key.length); // Should be 32
console.log("IV:", iv);
console.log("IV Length:", iv.length); // Should be 16

// Encryption function
function encrypt(message) {
  try {
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(message, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return `${iv.toString('hex')}:${encrypted}`; // Return IV:encrypted format
  } catch (error) {
    console.error(`Encryption failed for message "${message}":`, error);
    return null;
  }
}

// Decryption function
function decrypt(encryptedText) {
  try {
    const [ivHex, encryptedMessage] = encryptedText.split(":"); // Split IV and ciphertext
    const iv = Buffer.from(ivHex, 'hex'); // Convert IV back to a buffer
    const decipher = crypto.createDecipheriv(algorithm, key, iv);

    let decrypted = decipher.update(encryptedMessage, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    console.error("Decryption failed:", error);
    return null; // Return null if decryption fails
  }
}

// Messages to test
const messages = [
  "Welcome to the Broadcast Chat! Feel free to share your ideas.",
  "Stay respectful and enjoy chatting with others!"
];

// Test encryption and decryption
messages.forEach((message) => {
  console.log(`Original Message: ${message}`);
  
  // Encrypt the message
  const encrypted = encrypt(message);
  if (encrypted) {
    console.log(`Encrypted: ${encrypted}`);
    
    // Decrypt the encrypted message
    const decrypted = decrypt(encrypted);
    console.log(`Decrypted: ${decrypted}`);
    
    // Verify decryption
    if (message === decrypted) {
      console.log("Decryption successful! The original message matches the decrypted message.\n");
    } else {
      console.error("Decryption failed! The original message does not match the decrypted message.\n");
    }
  }
});



// const crypto = require('crypto');

// // Generate a random 32-byte key
// const key = crypto.randomBytes(32); // 32 bytes = 256 bits
// console.log(key.toString('hex')); // Print the key as a hex string

// const crypto = require('crypto');

// // Generate a random 16-byte IV
// const iv = crypto.randomBytes(16); // 16 bytes = 128 bits
// console.log(iv.toString('hex')); // Print the IV as a hex string

// const key = "b5e45c61d6df9d37916f2696f8c9ad06a7605839887f5fbd22e3cf3785a17030";

// if (key.length !== 64) {
//   throw new Error("Invalid encryption key length. It must be 64 hexadecimal characters.");
// }

// const bufferKey = Buffer.from(key, "hex");
// if (bufferKey.length !== 32) {
//   throw new Error("Invalid encryption key. It must be 32 bytes.");
// }

// console.log("The key is valid.");
