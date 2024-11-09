// Import dependencies
require("dotenv").config();
const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const mysql = require("mysql2");
const cors = require("cors");
const bcrypt = require("bcrypt");
const crypto = require('crypto');
const jwt = require("jsonwebtoken");

const hashMessage = (message) => crypto.createHash('sha256').update(message).digest('hex');


const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.CLIENT_ORIGIN,
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors({ origin: process.env.CLIENT_ORIGIN }));
app.use(express.json());

const authenticateToken = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Access denied, token missing!" });

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
      if (err) return res.status(403).json({ error: "Invalid token" });
      req.user = user; // Attach user info to request
      next();
  });
};

// Protect routes with authenticateToken
app.use("/profile", authenticateToken);
app.use("/chatrooms/:chatId/messages", authenticateToken);


// MySQL database connection setup with pooling
const db = mysql.createPool({
  connectionLimit: 10,
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

db.getConnection((err, connection) => {
  if (err) {
    console.error("Database connection error:", err);
  } else {
    console.log("Connected to MySQL database.");
    connection.release(); // Return the connection to the pool
  }
});


// ======================= USER ROUTES =======================

app.post("/register", async (req, res) => {
  const { username, password, email, phone, bio, address, profession } = req.body;
  const role_id = 2; // Default role for regular users

  if (username.toLowerCase().includes("admin")) {
    return res.status(400).json({ error: "Usernames cannot contain 'admin'." });
  }

  const checkQuery = "SELECT * FROM user WHERE username = ? OR email = ?";
  db.query(checkQuery, [username, email], async (err, results) => {
    if (err) {
      console.error("Database check error:", err);
      return res.status(500).json({ error: "Database error during user check." });
    }

    if (results.length > 0) {
      return res.status(400).json({ error: "Username or email already exists." });
    }

    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      const insertUserQuery = "INSERT INTO user (username, password, email, role_id) VALUES (?, ?, ?, ?)";

      db.query(insertUserQuery, [username, hashedPassword, email, role_id], (err, result) => {
        if (err) {
          console.error("Failed to insert user:", err);
          return res.status(500).json({ error: "Failed to save user." });
        }
        const userId = result.insertId;

        // Insert the user's profile
        const insertProfileQuery = `
          INSERT INTO profile (user_id, phone, bio, address, profession, education_level)
          VALUES (?, ?, ?, ?, ?, ?)
        `;
        
        db.query(insertProfileQuery, [
          userId,
          phone || "Not specified",
          bio || "Bio info please",
          address || "Type your address",
          profession || "What is your profession",
          "Not specified" // Default value for education_level
        ], (err) => {
          if (err) {
            console.error("Failed to create user profile:", err);
            return res.status(500).json({ error: "Failed to create user profile." });
          }

          // Generate JWT token
          const token = jwt.sign(
            { userId: userId, roleId: role_id },
            process.env.JWT_SECRET, // Make sure this is set as an environment variable
            { expiresIn: "1h" }
          );

          res.json({
            message: "Registration successful!",
            token, // Return the token for immediate login
            userId,
            role_id
          });
        });
      });
    } catch (hashError) {
      console.error("Password hashing error:", hashError);
      return res.status(500).json({ error: "Password hashing failed." });
    }
  });
});


// User Login
app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  // Check if database is accessible
  db.getConnection((connectionErr, connection) => {
    if (connectionErr) {
      console.error("Database connection error:", connectionErr);
      return res.status(500).json({ error: "Unable to connect to the database." });
    }
    connection.release(); // Release the connection back to the pool

    // Proceed with the login query if the database is accessible
    const query = "SELECT user_id, password, role_id FROM user WHERE username = ?";
    db.query(query, [username], async (err, results) => {
      if (err) {
        console.error("Database query error:", err);
        return res.status(500).json({ error: "Database error during login." });
      }

      if (results.length === 0) {
        return res.status(401).json({ error: "Invalid username or password." });
      }

      const user = results[0];
      try {
        // Verify the password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
          return res.status(401).json({ error: "Invalid username or password." });
        }

        // Generate JWT token upon successful login
        const token = jwt.sign(
          { userId: user.user_id, roleId: user.role_id },
          process.env.JWT_SECRET, // Ensure this environment variable is set
          { expiresIn: "1h" } // Token expires in 1 hour
        );

        // Return the JWT token along with the login response
        res.json({
          message: "Login successful!",
          token, // Include token in the response
          userId: user.user_id,
          role_id: user.role_id
        });
      } catch (compareError) {
        console.error("Password comparison error:", compareError);
        return res.status(500).json({ error: "Error validating password." });
      }
    });
  });
});


// User Profile Retrieval
app.get("/profile/:userId", (req, res) => {
  const { userId } = req.params;
  const query = `
    SELECT u.username, u.email, p.phone, p.bio, p.address, p.profession, p.education_level, u.role_id
    FROM user u
    JOIN profile p ON u.user_id = p.user_id
    WHERE u.user_id = ?`;

  db.query(query, [userId], (err, results) => {
    if (err) {
      console.error("Failed to fetch profile data:", err);
      return res.status(500).json({ error: "Failed to fetch profile data" });
    }
    
    if (results.length > 0) {
      const userData = results[0];
      
      if (userData.role_id === 1) {
        // Additional query for admin to fetch list of all users
        const adminDataQuery = `SELECT u.user_id, u.username, u.email, u.role_id FROM user u;`;

        db.query(adminDataQuery, [], (adminErr, adminResults) => {
          if (adminErr) {
            console.error("Failed to fetch admin data:", adminErr);
            return res.status(500).json({ error: "Failed to fetch admin data" });
          }
          res.json({ ...userData, usersList: adminResults });
        });
      } else {
        res.json(userData); // Return user data for non-admin users
      }
    } else {
      res.status(404).json({ error: "Profile not found" });
    }
  });
});


// Update Profile Fields
const updateProfileField = (field) => (req, res) => {
  const { userId } = req.params;
  const value = req.body[field];
  
  const updateQuery = `UPDATE profile SET ${field} = ? WHERE user_id = ?`;
  db.query(updateQuery, [value, userId], (err, result) => {
    if (err) return res.status(500).json({ error: `Failed to update ${field}` });
    if (result.affectedRows === 0) return res.status(404).json({ error: "Profile not found" });
    res.json({ message: `${field.charAt(0).toUpperCase() + field.slice(1)} updated successfully` });
  });
};

app.patch("/profile/:userId/phone", updateProfileField("phone"));
app.patch("/profile/:userId/bio", updateProfileField("bio"));
app.patch("/profile/:userId/address", updateProfileField("address"));
app.patch("/profile/:userId/profession", updateProfileField("profession"));

// fetch chats
app.get("/chats", (req, res) => {
  const query = `
    SELECT c.chat_id AS id, c.chat_name AS name, ct.type_name AS type, u.username AS created_by
    FROM Chat c
    JOIN Chat_Type ct ON c.chat_type_id = ct.chat_type_id
    LEFT JOIN user u ON c.created_by = u.user_id
  `;

  db.query(query, (err, results) => {
    if (err) {
      console.error("Failed to fetch chats:", err);
      return res.status(500).json({ error: "Failed to fetch chats" });
    }
    res.json(results);
  });
});

// Fetch messages for a specific chat room
app.get("/chatrooms/:chatId/messages", (req, res) => {
  const { chatId } = req.params;
  const query = `
    SELECT m.message_id AS id, m.content, m.timestamp, u.username 
    FROM messages m
    JOIN users u ON m.user_id = u.user_id
    WHERE m.chat_id = ?
    ORDER BY m.timestamp ASC
  `;

  db.query(query, [chatId], (err, results) => {
    if (err) {
      console.error("Failed to fetch messages:", err);
      return res.status(500).json({ error: "Failed to fetch messages" });
    }
    res.json(results);
  });
});



// ======================= SOCKET.IO CONNECTION =======================

io.on("connection", (socket) => {
  console.log("New client connected:", socket.id);

  const { userId } = socket.handshake.query;

  // Fetch undelivered messages for the connected user
  const fetchUndeliveredMessagesQuery = `
      SELECT m.message_id, m.content, m.timestamp, m.chat_id, u.username AS sender
      FROM messages m
      JOIN users u ON m.user_id = u.user_id
      WHERE m.delivered = FALSE AND m.chat_id IN (
          SELECT chat_id FROM user_chatrooms WHERE user_id = ?
      )
      ORDER BY m.timestamp ASC
  `;

  const encryptMessage = (message, publicKey) => {
    return crypto.publicEncrypt(publicKey, Buffer.from(message)).toString("base64");
  };

  db.query(fetchUndeliveredMessagesQuery, [userId], (err, messages) => {
      if (err) {
          console.error("Failed to fetch undelivered messages:", err);
          return;
      }

      // Send each undelivered message to the user
      messages.forEach((message) => {
          socket.emit("newMessage", message);
      });

      // After sending messages, mark them as delivered
      const messageIds = messages.map((msg) => msg.message_id);
      if (messageIds.length > 0) {
          const markAsDeliveredQuery = `
              UPDATE messages SET delivered = TRUE WHERE message_id IN (?)
          `;
          db.query(markAsDeliveredQuery, [messageIds], (updateErr) => {
              if (updateErr) {
                  console.error("Failed to update message delivery status:", updateErr);
              } else {
                  console.log(`Marked ${messageIds.length} messages as delivered for user ${userId}`);
              }
          });
      }
  });

  // Listen for sent messages from this client
  socket.on("sendMessage", async (messageData, callback) => {
    const { chatId, content, recipientId } = messageData;

    // Fetch the recipient's public key from the database
    const publicKeyQuery = "SELECT public_key FROM user WHERE user_id = ?";
    db.query(publicKeyQuery, [recipientId], (err, results) => {
        if (err || results.length === 0) {
            return callback({ success: false, error: "Failed to retrieve recipient's public key" });
        }

        const recipientPublicKey = results[0].public_key;
        const encryptedContent = encryptMessage(content, recipientPublicKey);

        // Store the encrypted message in the database
        const query = "INSERT INTO messages (chat_id, user_id, content, delivered) VALUES (?, ?, ?, FALSE)";
        db.query(query, [chatId, userId, encryptedContent], (err, result) => {
            if (err) {
                console.error("Failed to save encrypted message:", err);
                return callback({ success: false, error: "Failed to save message" });
            }

            const savedMessage = { id: result.insertId, chatId, content: encryptedContent, delivered: false };
            io.to(chatId).emit("newMessage", savedMessage);
            callback({ success: true, message: savedMessage });
        });
    });
  });

  // Handle client disconnect
  socket.on("disconnect", () => {
      console.log("Client disconnected:", socket.id);
  });
});

// ======================= ADMIN ROUTES =======================

// Admin - Get All Chats
app.get("/admin/chats", (req, res) => {
  const query = "SELECT * FROM chatrooms";
  db.query(query, (err, results) => {
    if (err) return res.status(500).json({ error: "Failed to fetch chats" });
    res.json(results);
  });
});

// Delete and Ban User
app.delete("/admin/users/:userId", (req, res) => {
  const { userId } = req.params;

  const deleteChatroomsQuery = "DELETE FROM user_chatrooms WHERE user_id = ?";
  const deleteUserQuery = "DELETE FROM users WHERE user_id = ?";
  const deleteProfileQuery = "DELETE FROM profiles WHERE user_id = ?";

  db.query(deleteChatroomsQuery, [userId], (chatErr) => {
    if (chatErr) return res.status(500).json({ error: "Failed to remove user from chatrooms" });
    db.query(deleteProfileQuery, [userId], (profileErr) => {
      if (profileErr) return res.status(500).json({ error: "Failed to delete user profile" });
      db.query(deleteUserQuery, [userId], (userErr, result) => {
        if (userErr) return res.status(500).json({ error: "Failed to delete user" });
        if (result.affectedRows === 0) return res.status(404).json({ error: "User not found" });
        res.json({ message: "User banned and deleted successfully" });
      });
    });
  });
});

// Create a New Chat Room
app.post("/admin/create-chat", (req, res) => {
  const { name } = req.body;
  const query = "INSERT INTO chatrooms (name) VALUES (?)";
  db.query(query, [name], (err, result) => {
    if (err) return res.status(500).json({ error: "Failed to create chat room" });
    res.json({ message: "Chat room created successfully", chatRoomId: result.insertId });
  });
});

// Add User by Admin
app.post("/admin/add-user", async (req, res) => {
  const { username, email, password, role_id = 2 } = req.body;

  const checkQuery = "SELECT * FROM users WHERE username = ? OR email = ?";
  db.query(checkQuery, [username, email], async (err, results) => {
    if (err) return res.status(500).json({ error: "Database error." });
    if (results.length > 0) return res.status(400).json({ error: "Username or email already exists." });

    const hashedPassword = await bcrypt.hash(password, 10);
    const insertUserQuery = "INSERT INTO users (username, email, password, role_id) VALUES (?, ?, ?, ?)";

    db.query(insertUserQuery, [username, email, hashedPassword, role_id], (err, result) => {
      if (err) return res.status(500).json({ error: "Failed to add user." });
      res.json({ message: "User added successfully", userId: result.insertId });
    });
  });
});


// ======================= CHATROOM ROUTES =======================

// Fetch User's Chatrooms
app.get("/user/:userId/chatrooms", (req, res) => {
  const { userId } = req.params;
  const query = `
    SELECT c.* FROM chatrooms c
    JOIN user_chatrooms uc ON c.id = uc.chatroom_id
    WHERE uc.user_id = ?`;
  
  db.query(query, [userId], (err, results) => {
    if (err) return res.status(500).json({ error: "Failed to fetch chatrooms for user" });
    res.json(results);
  });
});


// ======================= SERVER SETUP =======================
// Server setup
const PORT = 5000;
server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});