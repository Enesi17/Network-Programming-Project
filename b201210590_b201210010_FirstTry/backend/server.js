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
    origin: "*", 
    methods: ["GET", "POST"],
  },
});

const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.static('public'));
app.use(express.json());

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

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Access denied. No token provided." });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: "Invalid or expired token." });
    }

    // Debugging output
    console.log("Decoded JWT:", user);

    req.user = user;
    next();
  });
};

function isValidToken(token) {
    try {
        // Verify the token using the same secret key used to sign the JWTs
        jwt.verify(token, JWT_SECRET);
        return true; // Token is valid
    } catch (error) {
        return false; // Token is invalid
    }
}

// Utility Functions
function encrypt(text) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  return `${iv.toString("hex")}:${encrypted}`;
}

function decrypt(encryptedText) {
  try {
    const [ivHex, encryptedMessage] = encryptedText.split(":");
    if (!ivHex || !encryptedMessage) {
      throw new Error("Invalid encrypted text format");
    }

    const ivBuffer = Buffer.from(ivHex, "hex");
    const decipher = crypto.createDecipheriv(algorithm, key, ivBuffer);

    let decrypted = decipher.update(encryptedMessage, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch (error) {
    console.error("Decryption failed:", error.message);
    throw new Error("Decryption error");
  }
}
const onlineUsers = new Map();

//Socket Porgramming Part 

io.use((socket, next) => {
    const token = socket.handshake.query.token;
    if (isValidToken(token)) {
        return next();
    }
    return next(new Error('Authentication error'));
});

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);
  
  // Authenticate and store user
  const token = socket.handshake.query.token;
  const user = jwt.verify(token, JWT_SECRET);
  onlineUsers.set(user.userId, socket.id);

  // Join Broadcast Group on Connection
  socket.join("broadcast");
  console.log(`User ${user.userId} joined the broadcast group`);

  // Join a specific chat room
  socket.on('joinRoom', ({ chatId }) => {
      socket.join(chatId);
      console.log(`User ${socket.id} joined room ${chatId}`);
  });

  // Leave a chat room
  socket.on('leaveRoom', ({ chatId }) => {
      socket.leave(chatId);
      console.log(`User ${socket.id} left room ${chatId}`);
  });

  // Handle messages
  socket.on('chatMessage', async ({ chatId, message }) => {
      try {
          const { content, senderId } = message;

          // Encrypt the message
          const encryptedContent = encrypt(content);

          // Save the message to the database
          const [result] = await db.query(
              `INSERT INTO messages (chat_id, sender_id, content) VALUES (?, ?, ?)`,
              [chatId, senderId, encryptedContent]
          );

          // Broadcast the message
          io.to(chatId).emit('message', {
              messageId: result.insertId,
              chatId,
              senderId,
              content,
              timestamp: new Date(),
          });

      } catch (error) {
          console.error("Error saving or broadcasting message:", error);
      }
  });

  // Handle disconnect
  socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.id}`);
      onlineUsers.delete(user.userId);
  });
});


// Routes
//
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
  
  app.post("/chat/:chatId/message", authenticateToken, async (req, res) => {
    const { chatId } = req.params;
    const { content } = req.body;
  
    if (!content || !chatId) {
      return res.status(400).json({ error: "Chat ID and content are required." });
    }
  
    try {
      const senderId = req.user.userId; // Ensure this is set by the middleware
      const encryptedContent = encrypt(content);
  
      // Save the message to the database
      const [result] = await db.query(
        `INSERT INTO messages (chat_id, sender_id, content) VALUES (?, ?, ?)`,
        [chatId, senderId, encryptedContent]
      );
  
      res.status(201).json({
        message_id: result.insertId,
        chat_id: chatId,
        sender: req.user.username,
        content,
        timestamp: new Date(),
      });
    } catch (error) {
      console.error("Error saving message:", error);
      res.status(500).json({ error: "Failed to save message." });
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
  
  //handeling messages
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
  
      const decryptedMessages = messages.map((msg) => {
        try {
          return {
            ...msg,
            content: decrypt(msg.content), // Attempt to decrypt each message
          };
        } catch (err) {
          console.error(`Decryption failed for message ${msg.message_id}:`, err.message);
          return { ...msg, content: "[Failed to decrypt]" }; // Fallback message content
        }
      });
  
      res.status(200).json(decryptedMessages);
    } catch (error) {
      console.error("Error fetching messages for chat:", error);
      res.status(500).json({ error: "Failed to fetch messages." });
    }
  });
  

  // Endpoint to create a new group
  app.post('/create-group', async (req, res) => {
    const { groupName, userId, chatId } = req.body;

    try {
        // Step 1: Insert into group_chats table
        const [groupResult] = await db.query(
            'INSERT INTO group_chats (groupName, createdBy, createdAt) VALUES (?, ?, NOW())',
            [groupName, userId]
        );

        console.log("Insert result:", groupResult); // Log the result to debug
        const groupId = groupResult.insertId;

        if (!groupId) {
            throw new Error("Failed to retrieve group ID after group creation.");
        }

        // Step 2: Add the group creator as a member of the group
        await db.query(
            'INSERT INTO group_members (groupId, userId, role, joinedAt) VALUES (?, ?, "admin", NOW())',
            [groupId, userId]
        );

        // Step 3: Insert into chats table with chat_type as "group"
        await db.query(
            'INSERT INTO chats (chat_name, chat_type, created_by, created_at) VALUES (?, "multicast", ?, NOW())',
            [groupName, userId]
        );

        await db.query(
          'INSERT INTO chat_members (chat_id, user_id) VALUES (?, ?,)',
          [chatId, userId]
        );

        // Step 4: Respond with success
        res.json({ success: true, groupId });
    } catch (error) {
        console.error('Failed to create group:', error);
        res.status(500).json({ success: false, message: 'Failed to create group' });
    }
  });

  // Endpoint to add a new member to a group
  app.post('/add-member', async (req, res) => {
    const { groupId, userId, role = 'user' } = req.body;
    try {
      await db.query(
        'INSERT INTO group_members (groupId, userId, role, joinedAt) VALUES (?, ?, ?, NOW())',
        [groupId, userId, role]
      );
      res.send({ success: true, message: 'Member added successfully' });
    } catch (error) {
      console.error('Error adding member:', error);
      res.status(500).send({ success: false, message: 'Failed to add member' });
    }
  });

  // Endpoint to fetch all groups for a user
  app.get('/user-groups/:userId', async (req, res) => {
    try {
      const groups = await db.query(
        'SELECT g.groupId, g.groupName, g.createdAt FROM group_chats g JOIN group_members gm ON g.groupId = gm.groupId WHERE gm.userId = ?',
        [req.params.userId]
      );
      res.send({ success: true, groups });
    } catch (error) {
      console.error('Error fetching groups:', error);
      res.status(500).send({ success: false, message: 'Failed to fetch groups' });
    }
  });

  // Endpoint to fetch all members of a group
  app.get('/group-members/:groupId', async (req, res) => {
    const { chatId, userId } = req.body;
    try {
      const members = await db.query(
        'SELECT u.userId, u.username, gm.role FROM users u JOIN group_members gm ON u.userId = gm.userId WHERE gm.groupId = ?',
        [req.params.groupId]
      );
      await db.query(
        'INSERT INTO chat_members (chat_id, user_id) VALUES (?, ?,)',
        [chatId, userId]
      );
      res.send({ success: true, members });
    } catch (error) {
      console.error('Error fetching group members:', error);
      res.status(500).send({ success: false, message: 'Failed to fetch group members' });
    }
  });

  app.post('/join-group', async (req, res) => {
    const { groupId, chatId, userId } = req.body;
    console.log("Received groupId:", groupId, "and userId:", userId);

    if (!groupId || !userId) {
        return res.status(400).send({ success: false, message: 'Missing groupId or userId.' });
    }

    try {
        const [checkExist] = await db.query(
            'SELECT 1 FROM group_members WHERE groupId = ? AND userId = ?',
            [groupId, userId]
        );
        if (checkExist.length > 0) {
            return res.status(400).send({ success: false, message: 'User is already a member of this group.' });
        }

        await db.query(
            'INSERT INTO group_members (groupId, userId, role, joinedAt) VALUES (?, ?, "user", NOW())',
            [groupId, userId]
        );
        await db.query(
          'INSERT INTO chat_members (chat_id, user_id) VALUES (?, ?)',
          [chatId, userId]
      );
        res.send({ success: true, message: 'You have joined the group successfully.' });
    } catch (error) {
        console.error('Error joining group:', error);
        res.status(500).send({ success: false, message: 'Failed to join group' });
    }
});

  app.post('/leave-group', async (req, res) => {
    const { groupId, userId } = req.body;

    try {
        // Check if the user is actually a member of the group
        const isMember = await db.query(
            'SELECT 1 FROM group_members WHERE groupId = ? AND userId = ?',
            [groupId, userId]
        );
        if (isMember.length === 0) {
            return res.status(400).send({ success: false, message: 'User is not a member of this group.' });
        }

        // Remove the user from the group
        await db.query(
            'DELETE FROM group_members WHERE groupId = ? AND userId = ?',
            [groupId, userId]
        );

        await db.query(
          'DELETE FROM chat_members WHERE chat_id = ? AND user_id = ?',
          [chatId, userId]
        );

        res.send({ success: true, message: 'You have successfully left the group.' });
    } catch (error) {
        console.error('Error leaving group:', error);
        res.status(500).send({ success: false, message: 'Failed to leave group' });
    }
  });

  app.post('/ban-user', async (req, res) => {
    const { groupId, adminUserId, userIdToBan } = req.body;

    try {
        // Check if the requester is an admin of the group
        const isAdmin = await db.query(
            'SELECT 1 FROM group_members WHERE groupId = ? AND userId = ? AND role = "admin"',
            [groupId, adminUserId]
        );
        if (isAdmin.length === 0) {
            return res.status(403).send({ success: false, message: 'Only admins can ban users from the group.' });
        }

        // Check if the user to ban is actually a member of the group
        const isMember = await db.query(
            'SELECT 1 FROM group_members WHERE groupId = ? AND userId = ?',
            [groupId, userIdToBan]
        );
        if (isMember.length === 0) {
            return res.status(400).send({ success: false, message: 'User is not a member of this group.' });
        }

        // Remove the user from the group
        await db.query(
            'DELETE FROM group_members WHERE groupId = ? AND userId = ?',
            [groupId, userIdToBan]
        );
        res.send({ success: true, message: 'User has been successfully banned from the group.' });
    } catch (error) {
        console.error('Error banning user:', error);
        res.status(500).send({ success: false, message: 'Failed to ban user' });
    }
  });

  app.get('/search-group', async (req, res) => {
    const { name } = req.query; // Extract 'name' from query parameters
    try {
        // Query the database to fetch group details
        const [results] = await db.query(
            'SELECT groupId, groupName, createdBy, createdAt FROM group_chats WHERE groupName = ?',
            [name]
        );

        // Check if the group was found
        if (results.length > 0) {
            const group = results[0];
            res.json({
                success: true,
                group: {
                    id: group.groupId,
                    name: group.groupName,
                    admin: group.createdBy, // Assuming 'createdBy' stores the admin name or user ID
                    createdAt: group.createdAt
                }
            });
        } else {
            res.status(404).json({ success: false, message: 'Group not found' });
        }
    } catch (error) {
        console.error('Search group error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
  });

  app.get('/validate-user', async (req, res) => {
    const { username } = req.query;
    try {
        const [user] = await db.query('SELECT userId FROM users WHERE username = ?', [username]);
        if (user) {
            res.json({ success: true, userId: user.userId });
        } else {
            res.status(404).json({ success: false, message: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error validating user' });
    }
  });


  
  // Start Server
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });