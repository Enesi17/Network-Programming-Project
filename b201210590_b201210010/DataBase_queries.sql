CREATE TABLE roles (
    role_id INT PRIMARY KEY,
    role_name VARCHAR(50) NOT NULL
);

-- Populate roles table with initial data
INSERT INTO roles (role_id, role_name) VALUES 
(1, 'Admin'),
(2, 'User');

CREATE TABLE users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    username VARCHAR(100) NOT NULL,
    password VARCHAR(255) NOT NULL,
    role_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (role_id) REFERENCES roles(role_id)
);

INSERT INTO users (email, username, password, role_id) VALUES 
('admin@gmail.com', 'admin1', '$2b$10$zsmyX9Vh0uKn3li9NAd9Ne7GvqUCUAv3LyNbNqkp78KgVzHU7UfnG', 1);


CREATE TABLE profiles (
    profile_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    bio TEXT,
    profession VARCHAR(100) DEFAULT '',
    education VARCHAR(255) DEFAULT '',
    address TEXT,
    phone_number VARCHAR(15) DEFAULT '',
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);
ALTER TABLE profiles ADD COLUMN profile_picture VARCHAR(255) DEFAULT '';
INSERT INTO profiles (user_id, bio, profession, education, address, phone_number) VALUES 
(1, 'Administrator bio', 'System Administrator', 'Computer Science', 'Admin Address', '1234567890');

CREATE TABLE chats (
    chat_id INT AUTO_INCREMENT PRIMARY KEY,
    chat_name VARCHAR(100) NOT NULL,
    chat_type ENUM('broadcast', 'multicast', 'private') NOT NULL,
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(user_id)
);

-- Insert the broadcast chat created by the admin
INSERT INTO chats (chat_name, chat_type, created_by) VALUES 
('Broadcast Chat', 'broadcast', 1);


CREATE TABLE messages (
    message_id INT AUTO_INCREMENT PRIMARY KEY,
    chat_id INT NOT NULL,
    sender_id INT NOT NULL,
    content TEXT NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (chat_id) REFERENCES chats(chat_id),
    FOREIGN KEY (sender_id) REFERENCES users(user_id)
);
ALTER TABLE messages MODIFY content CHAR(64) NOT NULL;
ALTER TABLE messages MODIFY content LONGTEXT;

INSERT INTO messages (chat_id, sender_id, content)
VALUES
(1, 1, '27350e590351004443591d50ef8fddbc:0d9fdedefd78e99fe0eb30308ee80caca026dcb6a7a480e25ae98b6f39d2efa2a11127b894c764a2f302c6cc00e2679f2720bcded3e670dab13a6630d01a4033'),
(1, 1, '27350e590351004443591d50ef8fddbc:acfabd3b091f778d22202b487ea2c03f2caae1350ea8b9faf6985b0161305f330a5140b37a19f883cead847c10d58944');


CREATE TABLE chat_members (
    chat_id INT NOT NULL,
    user_id INT NOT NULL,
    PRIMARY KEY (chat_id, user_id),
    FOREIGN KEY (chat_id) REFERENCES chats(chat_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- Add the admin to the broadcast chat
INSERT INTO chat_members (chat_id, user_id) VALUES 
(1, 1);

CREATE TABLE group_chats (
  groupId INT AUTO_INCREMENT PRIMARY KEY,
  groupName VARCHAR(255) NOT NULL,
  createdBy INT,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (createdBy) REFERENCES users(user_Id)
  ON DELETE SET NULL
);

CREATE TABLE group_members (
  groupId INT NOT NULL,
  userId INT NOT NULL,
  role VARCHAR(50) DEFAULT 'member',
  joinedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (groupId, userId),
  FOREIGN KEY (groupId) REFERENCES group_chats(groupId)
  ON DELETE CASCADE,
  FOREIGN KEY (userId) REFERENCES users(user_Id)
  ON DELETE CASCADE
);

ALTER TABLE group_chats ADD COLUMN chatId INT;
ALTER TABLE group_chats ADD FOREIGN KEY (chatId) REFERENCES chats(chat_id) ON DELETE CASCADE;
