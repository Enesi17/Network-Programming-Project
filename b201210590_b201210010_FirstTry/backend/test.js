const express = require('express');
const http = require('http');
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",  // Allow all origins for testing purposes
    methods: ["GET", "POST"]
  }
});

const PORT = 5001;  // Use a suitable port for the server

io.on('connection', (socket) => {
  console.log('A user connected: ' + socket.id);

  socket.on('disconnect', () => {
    console.log('User disconnected: ' + socket.id);
  });

  socket.on('sendMessage', (message) => {
    console.log('Message received:', message);
    // Broadcast the message to all clients
    io.emit('receiveMessage', message);
  });
});

const bcrypt = require('bcrypt');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

console.log("Welcome to the password hashing tool!");

rl.question('Enter the password to hash: ', async (password) => {
  try {
    const hashedPassword = await hashPassword(password);
    console.log(`Hashed Password: ${hashedPassword}`);

    rl.question('Do you want to verify the hash? (yes/no): ', async (answer) => {
      if (answer.toLowerCase() === 'yes') {
        rl.question('Enter the password to verify: ', async (verifyPass) => {
          const isMatch = await verifyPassword(verifyPass, hashedPassword);
          if (isMatch) {
            console.log('Password verification successful!');
          } else {
            console.log('Password verification failed!');
          }
          rl.close();
        });
      } else {
        console.log('Exiting. Have a great day!');
        rl.close();
      }
    });
  } catch (error) {
    console.error('An error occurred:', error);
    rl.close();
  }
});

server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
