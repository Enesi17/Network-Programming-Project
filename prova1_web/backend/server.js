// Import dependencies
const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const bcrypt = require("bcrypt");

const app = express();
app.use(cors());
app.use(express.json());

// MySQL database connection setup
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "Enesi-1707",
  database: "webchat"
});

db.connect((err) => {
  if (err) {
    console.error("Database connection error:", err);
  } else {
    console.log("Connected to MySQL database.");
  }
});

// ======================= USER ROUTES =======================

// User Registration
app.post("/register", async (req, res) => {
  const { username, password, email, phone, bio, address, profession } = req.body;
  const role_id = 2; // Default role for regular users

  // Check if the username includes "admin" (case insensitive)
  if (username.toLowerCase().includes("admin")) {
    return res.status(400).json({ error: "Usernames cannot contain 'admin'." });
  }

  // Check if the username or email already exists
  const checkQuery = "SELECT * FROM users WHERE username = ? OR email = ?";
  db.query(checkQuery, [username, email], async (err, results) => {
    if (err) return res.status(500).json({ error: "Database error." });
    if (results.length > 0) {
      return res.status(400).json({ error: "Username or email already exists." });
    }

    // Hash the password before inserting it
    const hashedPassword = await bcrypt.hash(password, 10);
    const insertUserQuery = "INSERT INTO users (username, password, email, role_id) VALUES (?, ?, ?, ?)";

    // Insert into users table
    db.query(insertUserQuery, [username, hashedPassword, email, role_id], (err, result) => {
      if (err) return res.status(500).json({ error: "Failed to save user." });
      const userId = result.insertId;

      // Insert into profiles table
      const insertProfileQuery = "INSERT INTO profiles (user_id, phone, bio, address, profession) VALUES (?, ?, ?, ?, ?)";
      db.query(insertProfileQuery, [userId, phone || "phone", bio || "bio info please", address || "type your address", profession || "what is your profession"], (err) => {
        if (err) return res.status(500).json({ error: "Failed to create user profile." });
        res.json({ message: "Registration successful!" });
      });
    });
  });
});

// User Login
app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  const query = "SELECT user_id, password, role_id FROM users WHERE username = ?";
  db.query(query, [username], async (err, results) => {
    if (err) return res.status(500).json({ error: "Database error." });
    if (results.length === 0) return res.status(401).json({ error: "Invalid username or password." });

    const user = results[0];
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) return res.status(401).json({ error: "Invalid username or password." });

    // Successful login
    res.json({
      message: "Login successful!",
      userId: user.user_id,
      role_id: user.role_id
    });
  });
});

// User Profile Retrieval
app.get("/profile/:userId", (req, res) => {
  const { userId } = req.params;
  const query = `
    SELECT u.username, u.email, p.phone, p.bio, p.address, p.profession, u.role_id
    FROM users u
    JOIN profiles p ON u.user_id = p.user_id
    WHERE u.user_id = ?`;

  db.query(query, [userId], (err, results) => {
    if (err) return res.status(500).json({ error: "Failed to fetch profile data" });
    if (results.length > 0) {
      const userData = results[0];
      if (userData.role_id === 1) {  // Admin role
        // Fetch additional data for admin
        const adminDataQuery = `SELECT u.user_id, u.username, u.email, u.role_id FROM users u;`;

        db.query(adminDataQuery, [], (adminErr, adminResults) => {
          if (adminErr) return res.status(500).json({ error: "Failed to fetch admin data" });
          res.json({ ...userData, usersList: adminResults });
        });
      } else {
        res.json(userData);
      }
    } else {
      res.status(404).json({ error: "Profile not found" });
    }
  });
});

// Profile Update Fields (phone, bio, address, profession)
const updateProfileField = (field) => (req, res) => {
  const { userId } = req.params;
  const value = req.body[field];
  
  const updateQuery = `UPDATE profiles SET ${field} = ? WHERE user_id = ?`;
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

// ======================= ADMIN ROUTES =======================

// Admin - Get All Chats
app.get("/admin/chats", (req, res) => {
  const query = "SELECT * FROM chatrooms";
  db.query(query, (err, results) => {
    if (err) return res.status(500).json({ error: "Failed to fetch chats" });
    res.json(results);
  });
});

// Delete and Ban User Permanently
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

// Create a new chat room
app.post("/admin/create-chat", (req, res) => {
  const { name } = req.body;
  const query = "INSERT INTO chatrooms (name) VALUES (?)";
  db.query(query, [name], (err, result) => {
    if (err) return res.status(500).json({ error: "Failed to create chat room" });
    res.json({ message: "Chat room created successfully", chatRoomId: result.insertId });
  });
});

// Add a new user manually
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

// Fetch chatrooms where the user is a member
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

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
