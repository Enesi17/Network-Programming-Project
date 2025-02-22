import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import io from "socket.io-client";
import "../index.css";

const ChatRoom = () => {
  const { chatId } = useParams();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [onlineUsers, setOnlineUsers] = useState([]);
  const navigate = useNavigate();
  const socketRef = useRef(null);

  // Fetch messages from the database
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const response = await fetch(`http://localhost:5000/chat/${chatId}/messages`);
        if (!response.ok) {
          throw new Error("Failed to fetch messages");
        }
        const data = await response.json();
        setMessages(data);
      } catch (error) {
        console.error("Error fetching messages:", error);
      }
    };

    fetchMessages();
  }, [chatId]);

  // Initialize Socket.IO connection
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      console.error("No token found, please login.");
      navigate("/login");
      return;
    }

    socketRef.current = io("http://localhost:5000", {
      query: { token }
    });

    socketRef.current.on("connect", () => {
      console.log("Connected to socket server:", socketRef.current.id);
      socketRef.current.emit("joinRoom", { chatId });
    });

    socketRef.current.on("message", (message) => {
      console.log("Received message:", message);
      setMessages(prevMessages => {
        // Check if the message is already in the list to avoid duplicates
        if (!prevMessages.some(m => m.messageId === message.messageId)) {
          return [...prevMessages, message];
        }
        return prevMessages;
      });
    });

    socketRef.current.on("onlineUsers", (users) => {
      setOnlineUsers(users);
    });

    socketRef.current.on("connect_error", (err) => {
      console.error("Socket connection error:", err);
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.emit("leaveRoom", { chatId });
        socketRef.current.disconnect();
      }
    };
  }, [chatId, navigate]);

  // Handle sending a new message
  const handleSendMessage = () => {
    if (newMessage.trim()) {
      const message = {
        content: newMessage,
        senderId: localStorage.getItem('userId'), // Assume this is stored at login
      };
      socketRef.current.emit("chatMessage", { chatId, message });
      // Do not add here, only add on message received to prevent duplicates
      setNewMessage(""); // Clear input
    }
  };

  const handleBack = () => navigate("/chats");
  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
  };

  return (
    <div className="chat-room-container">
      <div className="chat-header">
        <h2>Chat Room</h2>
        <span className="online-status">Online Users: {onlineUsers.length}</span>
      </div>
      <div className="chat-messages">
        {messages.length > 0 ? (
          messages.map((message, index) => (
            <div key={index} className="chat-message">
              <span className="sender">{message.sender || "Unknown"}:</span>
              <span className="content">{message.content}</span>
            </div>
          ))
        ) : (
          <p className="no-messages">No messages yet. Start the conversation!</p>
        )}
      </div>
      <div className="chat-input">
        <input
          type="text"
          placeholder="Type a message..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
        />
        <button onClick={handleSendMessage}>Send</button>
      </div>
      <div>
        <button onClick={handleBack} className="logout-button">Exit</button>
        <button onClick={handleLogout} className="logout-button">LogOut</button>
      </div>
    </div>
  );
};

export default ChatRoom;
