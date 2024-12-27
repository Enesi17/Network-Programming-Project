import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';

const Test = () => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const socketRef = useRef(null);

  useEffect(() => {
    // Connect to the socket server
    socketRef.current = io("http://localhost:5001");  // Ensure the URL matches your server

    socketRef.current.on("receiveMessage", (message) => {
      setMessages(prevMessages => [...prevMessages, message]);
    });

    return () => {
      socketRef.current.disconnect();
    };
  }, []);

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      socketRef.current.emit("sendMessage", newMessage);
      setNewMessage('');
    }
  };

  return (
    <div>
      <h2>Chat Room</h2>
      <div>
        {messages.map((message, index) => (
          <p key={index}>{message}</p>
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

export default Test;
