import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import io from "socket.io-client";
import "../index.css";

const ChatRoom = () => {
  const { chatId } = useParams();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [socket, setSocket] = useState(null); // State to store socket instance

  useEffect(() => {
    // Initialize socket connection
    const newSocket = io("http://localhost:5000");
    setSocket(newSocket); // Save socket instance to state

    newSocket.emit("joinRoom", { chatId });

    newSocket.on("message", (message) => {
      setMessages((prevMessages) => [...prevMessages, message]);
    });

    newSocket.on("onlineUsers", (users) => {
      setOnlineUsers(users);
    });

    return () => {
      // Cleanup on unmount
      newSocket.emit("leaveRoom", { chatId });
      newSocket.disconnect();
    };
  }, [chatId]);

  const handleSendMessage = () => {
    if (newMessage.trim() && socket) {
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
              <span className="sender">{message.sender}:</span>
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
