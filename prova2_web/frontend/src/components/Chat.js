import React, { useState, useEffect } from "react";
import axios from "axios";

const Chat = ({ chatId }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");

  useEffect(() => {
    // Fetch previous messages here or set up real-time listening with sockets
  }, [chatId]);

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      // For now, just add the message locally; expand with backend API for actual storage
      setMessages([...messages, { text: newMessage, sender: "You" }]);
      setNewMessage("");
    }
  };

  return (
    <div className="chat-component">
      <h2>Chat</h2>
      <div className="messages">
        {messages.map((msg, index) => (
          <p key={index}><strong>{msg.sender}:</strong> {msg.text}</p>
        ))}
      </div>
      <input
        type="text"
        value={newMessage}
        onChange={(e) => setNewMessage(e.target.value)}
        placeholder="Type a message..."
      />
      <button onClick={handleSendMessage}>Send</button>
    </div>
  );
};

export default Chat;
