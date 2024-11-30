import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import io from "socket.io-client";
import "../index.css";

const ChatRoom = () => {
  const { chatId } = useParams();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [socket, setSocket] = useState(null);

  // Fetch messages from the database
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const response = await fetch(`http://localhost:5000/chat/${chatId}/messages`);
        if (!response.ok) {
          throw new Error("Failed to fetch messages");
        }
        const data = await response.json();
        setMessages(data); // Set the initial messages
      } catch (error) {
        console.error("Error fetching messages:", error);
      }
    };

    fetchMessages();
  }, [chatId]);

  useEffect(() => {
    // Initialize socket connection
    const newSocket = io("http://localhost:5000");
    setSocket(newSocket);

    newSocket.on("connect", () => {
      console.log("Connected to socket server:", newSocket.id);
      newSocket.emit("joinRoom", { chatId });
    });

    newSocket.on("message", (message) => {
      console.log("Received message:", message); // Debugging
      setMessages((prevMessages) => [...prevMessages, message]);
    });

    

    newSocket.on("onlineUsers", (users) => {
      console.log("Online users:", users); // Debugging
      setOnlineUsers(users);
    });

    newSocket.on("connect_error", (err) => {
      console.error("Socket connection error:", err);
    });

    return () => {
      newSocket.emit("leaveRoom", { chatId });
      newSocket.disconnect();
    };
  }, [chatId]);

  const handleSendMessage = () => {
  if (newMessage.trim() && socket) {
    console.log("Sending message:", newMessage); // Debugging
    socket.emit("chatMessage", { chatId, content: newMessage });
    setNewMessage("");
  }
};

  return (
    <div className="chat-room-container">
      <div className="chat-header">
        <h2>Chat Room</h2>
        <span className="online-status">
          Online Users: {onlineUsers.length}
        </span>
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
    </div>
  );
};

export default ChatRoom;
