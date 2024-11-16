const express = require("express");
const bcrypt = require("bcrypt");
const cors = require("cors");
const mysql = require("mysql2/promise");
const app = express();
const jwt = require("jsonwebtoken");
require("dotenv").config();

app.use(express.json());
app.use(cors({ origin: "http://localhost:3000" }));

// Database connection
const db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

app.post("/register", async (req, res) => {
  const { username, password, email } = req.body;

  // Input Validation
  if (!username || !password || !email) {
      return res.status(400).json({ error: "All fields are required." });
  }

  try {
      // Check if the email is already registered
      const [existingUser] = await db.query("SELECT * FROM users WHERE email = ?", [email]);
      if (existingUser.length > 0) {
          return res.status(400).json({ error: "Email is already registered." });
      }

      // Hash the password securely
      const hashedPassword = await bcrypt.hash(password, 10);

      // Insert user into the users table and retrieve the user_id
      const [result] = await db.query(
          "INSERT INTO users (username, password, email, role_id) VALUES (?, ?, ?, ?)",
          [username, hashedPassword, email, 2] // Default role: user
      );

      const userId = result.insertId;

      // Insert a related record into the profiles table with default values
      await db.query(
        "INSERT INTO profiles (user_id, bio, profession, education, address, phone_number) VALUES (?, ?, ?, ?, ?, ?)",
        [userId, "This is the default bio", "", "", "", ""]
      );

      // Automatically add the user to the Broadcast Chat (chat_id = 1)
      await db.query(
        "INSERT INTO chat_members (chat_id, user_id) VALUES (?, ?)",
        [1, userId] 
      );

      res.status(201).json({ message: "User registered successfully and added to Broadcast Chat!" });
  } catch (error) {
      console.error("Error during registration:", error);
      res.status(500).json({ error: "An error occurred while registering the user." });
  }
});


// Secret for JWT
const JWT_SECRET = process.env.JWT_SECRET; // Replace with an environment variable in production

app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: "All fields are required." });
  }

  try {
    // Check if the user exists
    const [user] = await db.query("SELECT * FROM users WHERE username = ?", [username]);

    if (user.length === 0) {
      return res.status(400).json({ error: "Invalid username or password." });
    }

    const foundUser = user[0];

    // Validate password
    const isPasswordValid = await bcrypt.compare(password, foundUser.password);
    if (!isPasswordValid) {
      return res.status(400).json({ error: "Invalid username or password." });
    }

    // Generate JWT token
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

//get the chat list
app.get("/admin/chats", async (req, res) => {
  try {
    const [chats] = await db.query("SELECT * FROM chats WHERE chat_type IN ('broadcast', 'multicast')");
    res.status(200).json(chats);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch chats." });
  }
});

app.get("/user/:userId/chats", async (req, res) => {
  const { userId } = req.params;

  try {
    // Query to fetch chats related to the user from chat_members and chats
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

    // If no chats found
    if (chats.length === 0) {
      return res.status(404).json({ error: "No chats found for this user." });
    }

    // Return the chats
    res.status(200).json(chats);
  } catch (error) {
    console.error("Error fetching chats for user:", error);
    res.status(500).json({ error: "Failed to fetch chats for the user." });
  }
});

//request group creation
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
    console.error(error);
    res.status(500).json({ error: "Failed to submit group creation request." });
  }
});

app.get("/search-groups", async (req, res) => {
  try {
    const [groups] = await db.query(
      "SELECT chat_id, name, type FROM chats WHERE type = 'multicast'"
    );
    res.status(200).json(groups);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch groups." });
  }
});


const PORT = 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
