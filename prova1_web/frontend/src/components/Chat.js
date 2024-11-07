import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

const Chat = () => {

  const { chatId } = useParams();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const userId = localStorage.getItem("userId");

  useEffect(() => {
    if (!chatId) return;

    const fetchMessages = async () => {
      try {
        const response = await fetch(`http://localhost:5000/chatrooms/${chatId}/messages`);
        if (!response.ok) throw new Error("Failed to fetch messages");
        const data = await response.json();
        setMessages(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();
  }, [chatId]);

  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    try {
      const response = await fetch(`http://localhost:5000/chatrooms/${chatId}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId, message: newMessage }),
      });

      if (!response.ok) {
        throw new Error("Failed to send message");
      }

      const savedMessage = await response.json();
      setMessages((prevMessages) => [...prevMessages, savedMessage]);
      setNewMessage("");
    } catch (err) {
      setError(err.message);
    }
  };

  const handleKeyPress = (event) => {
    if (event.key === "Enter") {
      sendMessage();
    }
  };

  if (loading) {
    return <div>Loading messages...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

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

export default Chat;
