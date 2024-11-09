CREATE TABLE Role (
    role_id INT AUTO_INCREMENT PRIMARY KEY,
    role_name VARCHAR(50) UNIQUE NOT NULL
);

INSERT INTO Role (role_name) VALUES 
    ('user'),
    ('admin');

CREATE TABLE User (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    role_id INT DEFAULT 1,
    FOREIGN KEY (role_id) REFERENCES Role(role_id) ON DELETE SET NULL
);


CREATE TABLE Chat_Type (
    chat_type_id INT AUTO_INCREMENT PRIMARY KEY,
    type_name VARCHAR(50) UNIQUE NOT NULL
);

INSERT INTO Chat_Type (type_name) VALUES 
    ('broadcast'),
    ('multicast'),
    ('private');

CREATE TABLE Profile (
    profile_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    bio TEXT,
    address VARCHAR(255),
    profession VARCHAR(100),
    education_level VARCHAR(100),
    FOREIGN KEY (user_id) REFERENCES User(user_id) ON DELETE CASCADE
);

CREATE TABLE Chat (
    chat_id INT AUTO_INCREMENT PRIMARY KEY,
    chat_name VARCHAR(100) NOT NULL,
    chat_type_id INT NOT NULL,
    created_by INT,
    FOREIGN KEY (chat_type_id) REFERENCES Chat_Type(chat_type_id) ON DELETE RESTRICT,
    FOREIGN KEY (created_by) REFERENCES User(user_id) ON DELETE SET NULL
);


CREATE TABLE User_Chat (
    user_chat_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    chat_id INT NOT NULL,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES User(user_id) ON DELETE CASCADE,
    FOREIGN KEY (chat_id) REFERENCES Chat(chat_id) ON DELETE CASCADE
);

CREATE TABLE Messages (
    message_id INT AUTO_INCREMENT PRIMARY KEY,
    chat_id INT NOT NULL,
    sender_id INT,
    content TEXT NOT NULL,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (chat_id) REFERENCES Chat(chat_id) ON DELETE CASCADE,
    FOREIGN KEY (sender_id) REFERENCES User(user_id) ON DELETE SET NULL
);


