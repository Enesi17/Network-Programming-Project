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
const io = new Server(server, 
    {cors: {
        origin: '*',
        methods: ["GET","POST"],
      }}
);

const PORT = process.env.PORT;
const db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
});
const JWT_SECRET = process.env.JWT_SECRET;
const algorithm = "aes-256-cbc";
const key = Buffer.from(process.env.ENCRYPTION_KEY, "hex");
//Middleware
app.use(cors());
app.use(express.static('public'));
app.use(express.json());

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(" ")[1];
    
    if(!token){
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

function isValidToken(token){
    try {
        jwt.verify(token, JWT_SECRET);
        return true;
    } catch (error) {
        return false;
    }
};

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

const onlineUsers = new Map();

//This is the backend functions for socket server
// Checking token while creating middelware for sockets (security measure)
io.use((socket, next) => {
    const token = socket.handshake.query.token;

    if (!token) {
        return next(new Error("Authentication error: No token provided"));
    }

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) {
            return next(new Error("Authentication error: Invalid token"));
        }
        console.log("Decoded JWT in socket middleware:", decoded);
        socket.username = decoded.username;
        socket.userId = decoded.userId;
        next();
    });
});
//Here we have all the functions like: connect, join, leave, disconnet
io.on('connection', (socket) => {
    console.log(`User connected: ${socket.username} (Socket ID: ${socket.id})`);

    socket.on('joinRoom', ({ chatId }) => {
        socket.join(chatId);
        console.log(`User ${socket.username} joined room ${chatId}`);
    });

    socket.on('leaveRoom', ({ chatId }) => {
        socket.leave(chatId);
        console.log(`User ${socket.username} left room ${chatId}`);
    });

    socket.on('chatMessage', async ({ chatId, message }) => {
        try {
            const { content, senderId } = message;
            const encryptedContent = encrypt(content);
            const [result] = await db.query(`INSERT INTO messages (chat_id, sender_id, content) VALUES (?, ?, ?)`,[chatId, senderId, encryptedContent]);
            io.to(chatId).emit('message', {
                messageId: result.insertId,
                chatId,
                senderId,
                sender: socket.username,
                content,
                timestamp: new Date(),
            });            
            console.log(`Message sent in room ${chatId} by ${socket.username}`);
        } catch (error) {
            console.error("Error saving or broadcasting message:", error);
        }
    });

    socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.username} (Socket ID: ${socket.id})`);
    });
});

//Here we have the api/endpoint for the 'signup.js' component
app.post("/register", async (req, res) => {
    const { username, password, email } = req.body;

    if(!username || !password || !email ){
        return res.status(400).json({error: "All fields are required."});
    }

    try {
        const [existingUser] = await db.query("SELECT * FROM users WHERE username = ?", [username]);
        if (existingUser.length > 0) {
          return res.status(400).json({ error: "This username is already registered." });
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

//Here we have the api/endpoint for the 'login.js' component 
app.post("/login", async (req, res) => {

    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: "Please fill all fields.All fields are required..." });
    }

    try {
        const [user] = await db.query("SELECT * FROM users WHERE username = ?", [username]);
        if (user.length === 0) {
            return res.status(400).json({ error: "Invalid username." });
        }

        const foundUser = user[0];
        const isPasswordValid = await bcrypt.compare(password, foundUser.password);
        if (!isPasswordValid) {
            return res.status(400).json({ error: "Invalid password." });
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

//Here we have the apis used to fetch the 'chats.js' in the chats components
// /admin/chats fetchs all the chats even if the admin is not part of it, but the private chats are not included
app.get("/admin/chats", async (req, res) => {
    try {
      const [chats] = await db.query("SELECT * FROM chats WHERE chat_type IN ('broadcast', 'multicast')");
      res.status(200).json(chats);
    } catch (error) {
      console.error("Error fetching chats:", error);
      res.status(500).json({ error: "Failed to fetch chats." });
    }
});
// /user/userId/chats fetches all the chats to list them for the user
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

      const decryptedChats = chats.map((chat) => {
          try {
              return {
                  ...chat,
                  lastMessage: chat.lastMessage ? decrypt(chat.lastMessage) : null,
              };
          } catch (error) {
              console.error("Decryption failed for chat:", chat.chat_id, error.message);
              return { ...chat, lastMessage: null };
          }
      });

      res.status(200).json(decryptedChats);
  } catch (error) {
      console.error("Error fetching chats for user:", error);
      res.status(500).json({ error: "Failed to fetch chats for the user." });
  }
});

// /chat/chatId/chats fetches messages for the chat selecetd
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

      const decryptedMessages = messages.map((msg) => {
          try {
              return {
                  ...msg,
                  content: msg.content ? decrypt(msg.content) : null,
              };
          } catch (error) {
              console.error("Decryption failed for message:", msg.message_id, error.message);
              return { ...msg, content: null };
          }
      });

      res.status(200).json(decryptedMessages);
  } catch (error) {
      console.error("Error fetching messages for chat:", error);
      res.status(500).json({ error: "Failed to fetch messages." });
  }
});

// /chat/private creating private room messages if it doesn't exists
app.post("/chat/private", async (req, res) => {
    const { userId, username } = req.body;

    if (!userId || !username) {
        return res.status(400).json({ error: "Both userId and username are required." });
    }

    try {
        const [users] = await db.query("SELECT user_id FROM users WHERE username = ?", [username]);
        if (users.length === 0) {
            return res.status(404).json({ error: "User not found" });
        }
        const targetUserId = users[0].user_id;

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
            const [creator] = await db.query("SELECT username FROM users WHERE user_id = ?", [userId]);
            if (creator.length === 0) {
                return res.status(404).json({ error: "Creator not found" });
            }
            const creatorUsername = creator[0].username;

            const chatName = `${creatorUsername}&${username}`;
            const [chatResult] = await db.query(
                "INSERT INTO chats (chat_name, chat_type, created_by) VALUES (?, ?, ?)",
                [chatName, "private", userId]
            );
            chatId = chatResult.insertId;

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

// /search-group/ this endpoint/api will search if the group searched exists
app.get('/search-group', async (req, res) => {
    const { name } = req.query;
  
    if (!name || name.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Group name query is required.' });
    }
  
    try {
      const [results] = await db.query(
        `SELECT groupId, groupName, createdBy, createdAt 
         FROM group_chats 
         WHERE groupName LIKE ?`,
        [`%${name}%`] // Allow partial matching with wildcard
      );
  
      if (results.length > 0) {
        const groups = results.map(group => ({
          id: group.groupId,
          name: group.groupName,
          admin: group.createdBy,
          createdAt: group.createdAt,
        }));
  
        res.json({ success: true, groups });
      } else {
        res.status(404).json({ success: false, message: 'No matching groups found.' });
      }
    } catch (error) {
      console.error('Search group error:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  });
// /create-group/ this endpoint/api will create a group if it is not existing
app.post('/create-group', async (req, res) => {
    const { groupName, userId } = req.body;
    const [existingGroup] = await db.query(
        'SELECT 1 FROM group_chats WHERE groupName = ?',
        [groupName]
    );
    if (existingGroup.length > 0) {
        return res.status(400).json({ success: false, message: 'Group name already exists.' });
    }

    try {
        // Step 1: Insert into chats table
        const [chatResult] = await db.query(
            'INSERT INTO chats (chat_name, chat_type, created_by, created_at) VALUES (?, "multicast", ?, NOW())',
            [groupName, userId]
        );

        const chatId = chatResult.insertId;

        if (!chatId) {
            throw new Error("Failed to retrieve chat ID after chat creation.");
        }

        // Step 2: Insert into group_chats table
        const [groupResult] = await db.query(
            'INSERT INTO group_chats (groupName, createdBy, chatId, createdAt) VALUES (?, ?, ?, NOW())',
            [groupName, userId, chatId]
        );

        const groupId = groupResult.insertId;

        if (!groupId) {
            throw new Error("Failed to retrieve group ID after group creation.");
        }

        // Step 3: Add the creator to chat_members
        await db.query(
            'INSERT INTO chat_members (chat_id, user_id) VALUES (?, ?)',
            [chatId, userId]
        );

        // Step 4: Add a system message about group creation
        const creationMessage = `This group was created by user ID ${userId} at ${new Date().toISOString()}.`;
        const encryptedMessage = encrypt(creationMessage);
        await db.query(
            'INSERT INTO messages (chat_id, sender_id, content, timestamp) VALUES (?, ?, ?, NOW())',
            [chatId, userId, encryptedMessage]
        );

        res.json({ success: true, groupId, chatId });
    } catch (error) {
        console.error('Failed to create group:', error);
        res.status(500).json({ success: false, message: 'Failed to create group' });
    }
});

// /join-group/ this endpoint/api will join a new member to an existing group 
app.post('/join-group', async (req, res) => {
    const { groupId, userId } = req.body;

    if (!groupId || !userId) {
        return res.status(400).send({ success: false, message: 'Missing groupId or userId.' });
    }

    try {
        // Step 1: Fetch the chatId for the group
        const [group] = await db.query(
            'SELECT chatId FROM group_chats WHERE groupId = ?',
            [groupId]
        );

        if (group.length === 0) {
            return res.status(404).send({ success: false, message: 'Group not found.' });
        }

        const chatId = group[0].chatId;

        // Step 2: Check if the user is already a member
        const [checkExist] = await db.query(
            'SELECT 1 FROM chat_members WHERE chat_id = ? AND user_id = ?',
            [chatId, userId]
        );

        if (checkExist.length > 0) {
            return res.status(400).send({ success: false, message: 'User is already a member of this group.' });
        }

        // Step 3: Add the user to chat_members
        await db.query(
            'INSERT INTO chat_members (chat_id, user_id) VALUES (?, ?)',
            [chatId, userId]
        );

        // Step 4: Add a system message about the new member
        const joinMessage = `User ID ${userId} joined the group at ${new Date().toISOString()}.`;
        const encryptedMessage = encrypt(joinMessage);
        await db.query(
            'INSERT INTO messages (chat_id, sender_id, content, timestamp) VALUES (?, ?, ?, NOW())',
            [chatId, userId, encryptedMessage]
        );

        res.send({ success: true, message: 'You have joined the group successfully.' });
    } catch (error) {
        console.error('Error joining group:', error);
        res.status(500).send({ success: false, message: 'Failed to join group' });
    }
});


// /leave-group/ this endpoint/api will make it able for a memeber leave a group
app.post('/leave-group', async (req, res) => {
    const { groupId, chatId, userId } = req.body;
  
    try {
        // Check if the user is a member of the group
        const [isMember] = await db.query(
            'SELECT 1 FROM group_members WHERE groupId = ? AND userId = ?',
            [groupId, userId]
        );
        if (isMember.length === 0) {
            return res.status(400).send({ success: false, message: 'User is not a member of this group.' });
        }
  
        // Remove the user from group_members table
        await db.query(
            'DELETE FROM group_members WHERE groupId = ? AND userId = ?',
            [groupId, userId]
        );
  
        // Remove the user from chat_members table
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
  
// /ban-user/ this endpoint is for admins-only to ban specific users
app.post('/ban-user', async (req, res) => {
    const { groupId, chatId, adminUserId, userIdToBan } = req.body;
  
    try {
        // Check if the admin has the authority to ban users
        const [isAdmin] = await db.query(
            'SELECT 1 FROM group_members WHERE groupId = ? AND userId = ? AND role = "admin"',
            [groupId, adminUserId]
        );
        if (isAdmin.length === 0) {
            return res.status(403).send({ success: false, message: 'Only admins can ban users from the group.' });
        }
  
        // Check if the user is a member of the group
        const [isMember] = await db.query(
            'SELECT 1 FROM group_members WHERE groupId = ? AND userId = ?',
            [groupId, userIdToBan]
        );
        if (isMember.length === 0) {
            return res.status(400).send({ success: false, message: 'User is not a member of this group.' });
        }
  
        // Remove the user from group_members table
        await db.query(
            'DELETE FROM group_members WHERE groupId = ? AND userId = ?',
            [groupId, userIdToBan]
        );
  
        // Remove the user from chat_members table
        await db.query(
            'DELETE FROM chat_members WHERE chat_id = ? AND user_id = ?',
            [chatId, userIdToBan]
        );
  
        res.send({ success: true, message: 'User has been successfully banned from the group.' });
    } catch (error) {
        console.error('Error banning user:', error);
        res.status(500).send({ success: false, message: 'Failed to ban user' });
    }
});

app.post('/delete-user', async (req, res) => {
    const { adminUserId, userIdToDelete } = req.body;

    try {
        // Check if the requesting user is an admin
        const [isAdmin] = await db.query(
            'SELECT 1 FROM users WHERE user_id = ? AND role_id = 1', // Assuming role_id = 1 is for admins
            [adminUserId]
        );

        if (isAdmin.length === 0) {
            return res.status(403).json({ success: false, message: 'Unauthorized. Only admins can delete users.' });
        }

        // Verify the user exists
        const [userExists] = await db.query(
            'SELECT 1 FROM users WHERE user_id = ?',
            [userIdToDelete]
        );

        if (userExists.length === 0) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        // Begin a transaction to ensure atomicity
        await db.query('START TRANSACTION');

        // Delete from `chat_members` table
        await db.query(
            'DELETE FROM chat_members WHERE user_id = ?',
            [userIdToDelete]
        );

        // Delete from `group_members` table
        await db.query(
            'DELETE FROM group_members WHERE userId = ?',
            [userIdToDelete]
        );

        // Delete from `profiles` table
        await db.query(
            'DELETE FROM profiles WHERE user_id = ?',
            [userIdToDelete]
        );

        // Delete all messages sent by the user
        await db.query(
            'DELETE FROM messages WHERE sender_id = ?',
            [userIdToDelete]
        );

        // Finally, delete the user from `users` table
        await db.query(
            'DELETE FROM users WHERE user_id = ?',
            [userIdToDelete]
        );

        // Commit the transaction
        await db.query('COMMIT');

        res.json({ success: true, message: 'User and all related data deleted successfully.' });

    } catch (error) {
        // Rollback in case of an error
        await db.query('ROLLBACK');
        console.error('Error deleting user:', error);
        res.status(500).json({ success: false, message: 'An error occurred while deleting the user.' });
    }
});


app.get("/users", async (req, res) => {
    try {
      const [users] = await db.query("SELECT * FROM users");
      res.status(200).json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ error: "Failed to fetch users." });
    }
});


// Start Server socket.io and for the other endpoints
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});