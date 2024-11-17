const express = require("express");
const bcrypt = require("bcrypt");
const cors = require("cors");
const mysql = require("mysql2/promise");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const http = require("http");
const { Server } = require("socket.io");
require("dotenv").config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

const PORT = 5000;

// Middleware
app.use(express.json());
app.use(cors({ origin: "http://localhost:3000" }));

// Database connection
const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

// Constants
const JWT_SECRET = process.env.JWT_SECRET;
const algorithm = "aes-256-cbc";
const key = Buffer.from(process.env.ENCRYPTION_KEY, "hex");

// Utility Functions
function encrypt(text) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  return `${iv.toString("hex")}:${encrypted}`;
}

function decrypt(encryptedText) {
  const [ivHex, encryptedMessage] = encryptedText.split(":");
  const ivBuffer = Buffer.from(ivHex, "hex");
  const decipher = crypto.createDecipheriv(algorithm, key, ivBuffer);
  let decrypted = decipher.update(encryptedMessage, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

// Online user tracking
const activeUsers = {};

// Socket.io integration
io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);

  // User joins a chat room
  socket.on("joinRoom", ({ userId, chatId }) => {
    console.log(`User joined chat room: ${chatId}`);
    socket.join(chatId);
    if (!activeUsers[userId]) {
      activeUsers[userId] = { socketId: socket.id, chatIds: new Set() };
    }
    activeUsers[userId].chatIds.add(chatId);
    io.to(chatId).emit("userOnline", userId);
  });

  // User leaves a chat room
  socket.on("leaveRoom", ({ userId, chatId }) => {
    console.log(`User leaved chat room: ${chatId}`);
    socket.leave(chatId);
    if (activeUsers[userId]) {
      activeUsers[userId].chatIds.delete(chatId);
      if (activeUsers[userId].chatIds.size === 0) {
        delete activeUsers[userId];
        io.emit("userOffline", userId);
      }
    }
  });

  // Handle sending messages
  socket.on("chatMessage", async ({ chatId, userId, content }) => {
    console.log(`Message received in chat ${chatId}: ${content}`);
    try {
      const encryptedContent = encrypt(content);

      // Store the message in the database
      await db.query(
        "INSERT INTO messages (chat_id, sender_id, content, timestamp) VALUES (?, ?, ?, NOW())",
        [chatId, userId, encryptedContent]
      );

      // Broadcast the message
      io.to(chatId).emit("message", {
        chatId,
        sender: userId,
        content,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error sending message:", error);
    }
  });

  // Handle disconnect
  socket.on("disconnect", () => {
    console.log(`User disconnected: ${socket.id}`);
    for (const [userId, userData] of Object.entries(activeUsers)) {
      if (userData.socketId === socket.id) {
        delete activeUsers[userId];
        io.emit("userOffline", userId);
        break;
      }
    }
  });
});

// Routes

// User Registration
app.post("/register", async (req, res) => {
  const { username, password, email } = req.body;

  if (!username || !password || !email) {
    return res.status(400).json({ error: "All fields are required." });
  }

  try {
    const [existingUser] = await db.query("SELECT * FROM users WHERE email = ?", [email]);
    if (existingUser.length > 0) {
      return res.status(400).json({ error: "Email is already registered." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const [result] = await db.query(
      "INSERT INTO users (username, password, email, role_id) VALUES (?, ?, ?, ?)",
      [username, hashedPassword, email, 2]
    );

    const userId = result.insertId;

    await db.query(
      "INSERT INTO profiles (user_id, bio, profession, education, address, phone_number) VALUES (?, ?, ?, ?, ?, ?)",
      [userId, "This is the default bio", "", "", "", ""]
    );

    await db.query("INSERT INTO chat_members (chat_id, user_id) VALUES (?, ?)", [1, userId]);

    res.status(201).json({ message: "User registered successfully and added to Broadcast Chat!" });
  } catch (error) {
    console.error("Error during registration:", error);
    res.status(500).json({ error: "An error occurred while registering the user." });
  }
});

// User Login
app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: "All fields are required." });
  }

  try {
    const [user] = await db.query("SELECT * FROM users WHERE username = ?", [username]);
    if (user.length === 0) {
      return res.status(400).json({ error: "Invalid username or password." });
    }

    const foundUser = user[0];
    const isPasswordValid = await bcrypt.compare(password, foundUser.password);
    if (!isPasswordValid) {
      return res.status(400).json({ error: "Invalid username or password." });
    }

    const token = jwt.sign(
      { userId: foundUser.user_id, username: foundUser.username, role: foundUser.role_id },
      JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.status(200).json({ token, userId: foundUser.user_id, username: foundUser.username, role: foundUser.role_id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "An error occurred during login." });
  }
});

// Admin Chat List
app.get("/admin/chats", async (req, res) => {
  try {
    const [chats] = await db.query("SELECT * FROM chats WHERE chat_type IN ('broadcast', 'multicast')");
    res.status(200).json(chats);
  } catch (error) {
    console.error("Error fetching chats:", error);
    res.status(500).json({ error: "Failed to fetch chats." });
  }
});

// User Chats
app.get("/user/:userId/chats", async (req, res) => {
  const { userId } = req.params;

  try {
    const [chats] = await db.query(
      `SELECT 
         c.chat_id, 
         c.chat_name, 
         c.chat_type, 
         c.created_at,
         m.content AS lastMessage,
         m.timestamp AS lastMessageTime
       FROM 
         chat_members cm
       JOIN 
         chats c ON cm.chat_id = c.chat_id
       LEFT JOIN 
         messages m ON m.message_id = (
           SELECT message_id 
           FROM messages 
           WHERE chat_id = c.chat_id 
           ORDER BY timestamp DESC 
           LIMIT 1
       )
       WHERE 
         cm.user_id = ?
       ORDER BY 
         m.timestamp DESC`,
      [userId]
    );

    if (chats.length === 0) {
      return res.status(404).json({ error: "No chats found for this user." });
    }

    const decryptedChats = chats.map((chat) => ({
      ...chat,
      lastMessage: chat.lastMessage ? decrypt(chat.lastMessage) : null,
    }));

    res.status(200).json(decryptedChats);
  } catch (error) {
    console.error("Error fetching chats for user:", error);
    res.status(500).json({ error: "Failed to fetch chats for the user." });
  }
});

// Chat Messages
app.get("/chat/:chatId/messages", async (req, res) => {
  const { chatId } = req.params;

  try {
    const [messages] = await db.query(
      `SELECT 
         m.message_id, 
         m.content, 
         m.timestamp, 
         u.username AS sender 
       FROM 
         messages m
       JOIN 
         users u ON m.sender_id = u.user_id
       WHERE 
         m.chat_id = ?
       ORDER BY 
         m.timestamp ASC`,
      [chatId]
    );

    if (messages.length === 0) {
      return res.status(404).json({ error: "No messages found for this chat." });
    }

    res.status(200).json(messages);
  } catch (error) {
    console.error("Error fetching messages for chat:", error);
    res.status(500).json({ error: "Failed to fetch messages for the chat." });
  }
});

// Group Requests
app.post("/request-group", async (req, res) => {
  const { userId, groupName } = req.body;

  if (!userId || !groupName) {
    return res.status(400).json({ error: "All fields are required." });
  }

  try {
    await db.query(
      "INSERT INTO group_requests (user_id, group_name, status) VALUES (?, ?, 'pending')",
      [userId, groupName]
    );
    res.status(201).json({ message: "Group creation request submitted successfully." });
  } catch (error) {
    console.error("Error submitting group request:", error);
    res.status(500).json({ error: "Failed to submit group creation request." });
  }
});

// Search Groups
app.get("/search-groups", async (req, res) => {
  try {
    const [groups] = await db.query(
      "SELECT chat_id, name, type FROM chats WHERE type = 'multicast'"
    );
    res.status(200).json(groups);
  } catch (error) {
    console.error("Error fetching groups:", error);
    res.status(500).json({ error: "Failed to fetch groups." });
  }
});

// create /chat/private
app.post("/chat/private", async (req, res) => {
  const { userId, username } = req.body;

  if (!userId || !username) {
    return res.status(400).json({ error: "Both userId and username are required." });
  }

  try {
    // Check if the username exists in the database
    const [users] = await db.query("SELECT user_id FROM users WHERE username = ?", [username]);
    if (users.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const targetUserId = users[0].user_id;

    // Check if a private chat already exists
    const [existingChat] = await db.query(
      `SELECT chat_id 
       FROM chats 
       WHERE chat_type = 'private' 
       AND EXISTS (
         SELECT 1 
         FROM chat_members 
         WHERE chat_id = chats.chat_id AND user_id IN (?, ?)
         GROUP BY chat_id
         HAVING COUNT(DISTINCT user_id) = 2
       )`,
      [userId, targetUserId]
    );

    let chatId;
    if (existingChat.length > 0) {
      chatId = existingChat[0].chat_id;
    } else {
      // Create a new private chat
      const [chatResult] = await db.query(
        "INSERT INTO chats (chat_name, chat_type, created_by) VALUES (?, ?, ?)",
        [`Private: ${username}`, "private", userId]
      );
      chatId = chatResult.insertId;

      // Add both users to the new private chat
      await db.query("INSERT INTO chat_members (chat_id, user_id) VALUES (?, ?), (?, ?)", [
        chatId, userId, chatId, targetUserId
      ]);
    }

    res.json({ chatId });
  } catch (error) {
    console.error("Error in /chat/private route:", error);
    res.status(500).json({ error: "An error occurred while creating or retrieving the private chat." });
  }
});

// Create multicast chat
app.post("/chat/multicast", async (req, res) => {
  const { createdBy, chatName, memberIds } = req.body;
  if (!createdBy || !chatName || !Array.isArray(memberIds) || memberIds.length === 0) {
    return res.status(400).json({ error: "Invalid request data." });
  }

  try {
    const [result] = await db.query(
      "INSERT INTO chats (chat_name, chat_type, created_by) VALUES (?, 'multicast', ?)",
      [chatName, createdBy]
    );
    const chatId = result.insertId;

    const values = memberIds.map((id) => `(${chatId}, ${id})`).join(",");
    await db.query(`INSERT INTO chat_members (chat_id, user_id) VALUES ${values}`);

    res.status(201).json({ chatId });
  } catch (error) {
    console.error("Error creating multicast chat:", error);
    res.status(500).json({ error: "Failed to create chat." });
  }
});

// handeling messages
app.get("/chat/:chatId/messages", async (req, res) => {
  const { chatId } = req.params;

  try {
    const [messages] = await db.query(
      `SELECT 
         m.message_id, 
         m.content, 
         m.timestamp, 
         u.username AS sender 
       FROM 
         messages m
       JOIN 
         users u ON m.sender_id = u.user_id
       WHERE 
         m.chat_id = ?
       ORDER BY 
         m.timestamp ASC`,
      [chatId]
    );

    const decryptedMessages = messages.map((msg) => ({
      ...msg,
      content: decrypt(msg.content),
    }));

    res.status(200).json(decryptedMessages);
  } catch (error) {
    console.error("Error fetching messages for chat:", error);
    res.status(500).json({ error: "Failed to fetch messages." });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
