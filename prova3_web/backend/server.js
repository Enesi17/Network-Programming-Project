// Import dependencies
require("dotenv").config();
const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const mysql = require("mysql2");
const cors = require("cors");
const bcrypt = require("bcrypt");

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

        // Update the insertProfileQuery to match all columns in the Profile table
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
          res.json({ message: "Registration successful!" });
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
        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
          return res.status(401).json({ error: "Invalid username or password." });
        }

        res.json({
          message: "Login successful!",
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




// ======================= SOCKET.IO CONNECTION =======================

io.on("connection", (socket) => {
  console.log("New client connected:", socket.id);

  const { userId, chatId } = socket.handshake.query;
  socket.join(chatId);

  socket.on("sendMessage", (messageData, callback) => {
    const { userId, chatId, content } = messageData;

    const query = "INSERT INTO messages (chat_id, user_id, content) VALUES (?, ?, ?)";
    db.query(query, [chatId, userId, content], (err, result) => {
      if (err) {
        console.error("Failed to save message:", err);
        return callback({ success: false, error: "Failed to save message" });
      }

      const savedMessage = { id: result.insertId, ...messageData };
      io.to(chatId).emit("newMessage", savedMessage);
      callback({ success: true, message: savedMessage });
    });
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
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