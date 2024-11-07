import React, { useEffect, useState } from "react";
import axios from "axios";

const ChatListPanel = ({ userId, onChatSelect }) => {
  const [chats, setChats] = useState([]);

  useEffect(() => {
    axios.get("http://localhost:5000/chats")
      .then((response) => setChats(response.data))
      .catch((error) => console.error("Failed to fetch chats", error));
  }, []);

  const handleJoinChat = (chatId) => {
    axios.post("http://localhost:5000/chats/join", { userId, chatId })
      .then(() => alert("Joined chat successfully"))
      .catch((error) => alert(error.response.data.error));
  };

  return (
    <div className="chat-list-panel">
      <h2>Available Chats</h2>
      <ul>
        {chats.map((chat) => (
          <li key={chat.chat_id}>
            <h3>{chat.name}</h3>
            <p>Type: {chat.type}</p>
            <p>Admin: {chat.admin_username}</p>
            <button onClick={() => handleJoinChat(chat.chat_id)}>Join</button>
            <button onClick={() => onChatSelect(chat.chat_id)}>Open Chat</button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ChatListPanel;
