const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const bcrypt = require("bcrypt");

const app = express();
app.use(cors());
app.use(express.json());

const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "Enesi-1707",
    database: "webchat"
  });

  db.connect((err)=>{
    if(err){
        console.error("Database connection error: ", err);
    }else{
        console.log("Connected to MySQL database.");
    }
  });

  const PORT = 5000;
  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  })

// User/Admin Login
app.post("/login", async (req, res) => {
    const { username, password } = req.body;

    const query = "SELECT user_id, password, role_id FROM users WHERE username = ?";
    db.query(query, [username], async (err, results) => {
        if (err) return res.status(500).json({ error: "Database error." });
        if (results.length === 0) return res.status(401).json({ error: "Invalid username or password." });

        const user = results[0];
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) return res.status(401).json({ error: "Invalid username or password." });

        res.json({
            message: "Login successful!",
            userId: user.user_id,
            role_id: user.role_id
        });
    });
});

// User Registration
app.post("/register", async (req, res) => {
  const { username, password, email, phone, bio, address, profession, first_name, last_name } = req.body;
  const role_id = 2;

  if (username.toLowerCase().includes("admin")) {
    return res.status(400).json({ error: "Usernames cannot contain 'admin'." });
  }

  const checkQuery = "SELECT * FROM users WHERE username = ? OR email = ?";
  db.query(checkQuery, [username, email], async (err, results) => {
    if (err) return res.status(500).json({ error: "Database error." });
    if (results.length > 0) {
      return res.status(400).json({ error: "Username or email already exists." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const insertUserQuery = "INSERT INTO users (username, password, email, role_id) VALUES (?, ?, ?, ?)";
    db.query(insertUserQuery, [username, hashedPassword, email, role_id], (err, result) => {
      if (err) return res.status(500).json({ error: "Failed to save user." });

      const userId = result.insertId;

      const insertProfileQuery = `
        INSERT INTO profile (user_id, first_name, last_name, phone, bio, address) 
        VALUES (?, ?, ?, ?, ?, ?)
      `;

      db.query(
        insertProfileQuery,
        [
          userId,
          first_name || "First Name",
          last_name || "Last Name",
          phone || "phone",
          bio || "bio info please",
          address || "type your address"
        ],
        (err) => {
          if (err) return res.status(500).json({ error: "Failed to create user profile." });
          
          // Add the user to the broadcast chat
          const broadcastChatQuery = "SELECT chat_id FROM chats WHERE name = 'broadcast'";
          db.query(broadcastChatQuery, (err, results) => {
            if (err) return res.status(500).json({ error: "Failed to find broadcast chat." });

            const broadcastChatId = results.length > 0 ? results[0].chat_id : null;

            // If the broadcast chat doesn't exist, create it
            if (!broadcastChatId) {
              const createBroadcastChatQuery = `
                INSERT INTO chats (name, type, num_members, admin_id)
                VALUES ('broadcast', 'broadcast', 0, NULL)
              `;
              db.query(createBroadcastChatQuery, (err, result) => {
                if (err) return res.status(500).json({ error: "Failed to create broadcast chat." });
                
                const newBroadcastChatId = result.insertId;
                addUserToChat(userId, newBroadcastChatId, res);
              });
            } else {
              // If broadcast chat exists, add user directly to it
              addUserToChat(userId, broadcastChatId, res);
            }
          });
        }
      );
    });
  });
});

// Helper function to add a user to a specific chat
const addUserToChat = (userId, chatId, res) => {
  const addUserChatQuery = "INSERT INTO user_chats (user_id, chat_id) VALUES (?, ?)";
  db.query(addUserChatQuery, [userId, chatId], (err) => {
    if (err) return res.status(500).json({ error: "Failed to add user to broadcast chat." });
    res.json({ message: "Registration successful! User added to broadcast chat." });
  });
};


// Fetch user profile
app.get("/profile/:userId", (req, res) => {
  const { userId } = req.params;
  const query = `
    SELECT u.username, u.email, u.role_id, p.first_name, p.last_name, p.phone, p.bio, p.address, p.profession
    FROM users u
    LEFT JOIN profile p ON u.user_id = p.user_id
    WHERE u.user_id = ?
  `;
  db.query(query, [userId], (err, results) => {
    if (err) return res.status(500).json({ error: "Failed to fetch profile." });
    if (results.length === 0) return res.status(404).json({ error: "Profile not found." });
    res.json(results[0]);
  });
});


// Fetch all chats
app.get("/chats", (req, res) => {
  const query = `
    SELECT c.chat_id, c.name, c.type, c.num_members, u.username AS admin_username
    FROM chats c
    LEFT JOIN users u ON c.admin_id = u.user_id
  `;
  db.query(query, (err, results) => {
    if (err) return res.status(500).json({ error: "Failed to fetch chats." });
    res.json(results);
  });
});

// Join a chat
app.post("/chats/join", (req, res) => {
  const { userId, chatId } = req.body;

  const checkMembershipQuery = "SELECT * FROM user_chats WHERE user_id = ? AND chat_id = ?";
  db.query(checkMembershipQuery, [userId, chatId], (err, results) => {
    if (err) return res.status(500).json({ error: "Database error." });
    if (results.length > 0) return res.status(400).json({ error: "User already joined the chat." });

    const joinChatQuery = "INSERT INTO user_chats (user_id, chat_id) VALUES (?, ?)";
    db.query(joinChatQuery, [userId, chatId], (err) => {
      if (err) return res.status(500).json({ error: "Failed to join chat." });
      res.json({ message: "Chat joined successfully!" });
    });
  });
});

// Get user's joined chats
app.get("/user-chats/:userId", (req, res) => {
  const { userId } = req.params;
  const query = `
    SELECT c.chat_id, c.name, c.type
    FROM chats c
    INNER JOIN user_chats uc ON c.chat_id = uc.chat_id
    WHERE uc.user_id = ?
  `;
  db.query(query, [userId], (err, results) => {
    if (err) return res.status(500).json({ error: "Failed to fetch user's chats." });
    res.json(results);
  });
});

