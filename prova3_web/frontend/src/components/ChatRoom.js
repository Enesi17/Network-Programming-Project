import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { io } from "socket.io-client";

import "../index.css";

const ChatRoom = () => {
  const { chatId } = useParams();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [error, setError] = useState(null);
  const userId = localStorage.getItem("userId");
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    if (!chatId) return;

    // Initialize Socket.IO client and connect
    const newSocket = io("http://localhost:5000", {
      query: { userId, chatId },
    });
    setSocket(newSocket);

    // Fetch initial messages
    const fetchMessages = async () => {
      try {
        const response = await fetch(`http://localhost:5000/chatrooms/${chatId}/messages`);
        if (!response.ok) throw new Error("Failed to fetch messages");
        const data = await response.json();
        setMessages(data);
      } catch (err) {
        setError(err.message);
      }
    };
    fetchMessages();

    // Listen for incoming messages from the server
    newSocket.on("newMessage", (message) => {
      setMessages((prevMessages) => [...prevMessages, message]);
    });

    // Cleanup on component unmount
    return () => newSocket.disconnect();
  }, [chatId, userId]);

  const sendMessage = () => {
    if (!newMessage.trim() || !socket) return;

    const messageData = {
      userId,
      chatId,
      content: newMessage,
    };

    // Emit message to server via Socket.IO
    socket.emit("sendMessage", messageData);
    setNewMessage("");
  };

  const handleKeyPress = (event) => {
    if (event.key === "Enter") {
      sendMessage();
    }
  };

  return (
    <div className="chat-container">
      <h2>Chat Room {chatId}</h2>
      <div className="messages-container">
        {messages.map((message) => (
          <div key={message.id} className="message-item">
            <strong>{message.username}: </strong>
            <span>{message.content}</span>
          </div>
        ))}
      </div>
      <div className="message-input-container">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Type your message..."
          className="message-input"
        />
        <button onClick={sendMessage} className="send-button">Send</button>
      </div>
    </div>
  );
};

export default ChatRoom;
