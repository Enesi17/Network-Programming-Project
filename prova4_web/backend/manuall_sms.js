const crypto = require('crypto');

const messages = [
  "Welcome to the Broadcast Chat! Feel free to share your ideas.",
  "Stay respectful and enjoy chatting with others!"
];

messages.forEach((message) => {
  const hash = crypto.createHash('sha256').update(message).digest('hex');
  console.log(`Original: ${message}`);
  console.log(`Hash: ${hash}`);
});
