import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../index.css";

const Chats = () => {
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const navigate = useNavigate();
  const userId = localStorage.getItem("userId");
  const username = localStorage.getItem("username");
  const isAdmin = localStorage.getItem("isAdmin") === "true";

  useEffect(() => {
    if (!userId) {
      navigate("/login"); // Redirect to login if userId is not set
    }
  }, [userId, navigate]);

  useEffect(() => {
    const fetchChats = async () => {
      try {
        console.log(userId);
        console.log(username);
        const endpoint = isAdmin
          ? "http://localhost:5000/admin/chats"
          : `http://localhost:5000/user/${userId}/chats`;

        const response = await fetch(endpoint);
        if (!response.ok) {
          throw new Error("Failed to fetch chatrooms");
        }

        const data = await response.json();
        setChats(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchChats();
  }, [isAdmin, userId]);

  const handleChatClick = async (chatId) => {
    try {
      // Save chatId to localStorage
      localStorage.setItem("chatId", chatId);
  
      // Fetch messages for the selected chat
      const response = await fetch(`http://localhost:5000/chat/${chatId}/messages`);
      if (!response.ok) {
        throw new Error("Failed to fetch messages");
      }
  
      const messages = await response.json();
      localStorage.setItem("messages", JSON.stringify(messages)); // Optionally store messages locally
  
      // Navigate to chatroom
      navigate(`/chatroom/${chatId}`);
    } catch (error) {
      console.error("Error fetching chat messages:", error);
      alert("Failed to load chat messages. Please try again.");
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
  };

  const handleRequestGroup = () => {
    navigate("/request-group");
  };

  const handleSearchGroups = () => {
    navigate("/search-groups");
  };

  if (loading) {
    return <div className="loading">Loading chatrooms...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <div className="chats-container">
      <div className="header">
        <h2>Chats</h2>
        <button className="logout-button" onClick={handleLogout}>
          Logout
        </button>
      </div>
      <div className="chats-list">
        {chats.length > 0 ? (
          chats.map((chat) => (
            <div key={chat.chat_id} className="chat-item">
              <div className="chat-info">
                <h3>{chat.name}</h3>
                <span className="chat-type">({chat.type})</span>
              </div>
              <p className="last-message">{chat.lastMessage || "No messages yet."}</p>
              <button
                onClick={() => handleChatClick(chat.chat_id)}
                className="open-chat-button"
              >
                Open Chat
              </button>
            </div>
          ))
        ) : (
          <p>No chatrooms available.</p>
        )}
      </div>
      <div className="actions">
        <button className="join-group-button" onClick={handleSearchGroups}>
          Search Groups
        </button>
        <button className="request-group-button" onClick={handleRequestGroup}>
          Request Group
        </button>
      </div>
    </div>
  );
};

export default Chats;
