import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import "../index.css";

const Chats = () => {
  const navigate = useNavigate();
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [privateChatUsername, setPrivateChatUsername] = useState("");
  const [showPrivateChatForm, setShowPrivateChatForm] = useState(false);

  const userId = localStorage.getItem("userId");
  const username = localStorage.getItem("username");
  const isAdmin = localStorage.getItem("isAdmin") === "true";

  useEffect(() => {
    if (!userId) {
      navigate("/login");
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
      const response = await fetch(`http://localhost:5000/chat/${chatId}/messages`);
      if (!response.ok) {
        const errorData = await response.json();
        console.error("Error response:", errorData);
        throw new Error(errorData.error || "Failed to fetch messages");
      }
  
      const messages = await response.json();
      localStorage.setItem("messages", JSON.stringify(messages)); // Optionally store messages locally
      navigate(`/chatroom/${chatId}`);
    } catch (error) {
      console.error("Error fetching chat messages:", error);
      alert("Failed to load chat messages. Please try again.");
    }
  };

  const handlePrivateChatSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(
        `http://localhost:5000/chat/private`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ userId, username: privateChatUsername }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to start private chat");
      }

      const data = await response.json();
      navigate(`/chatroom/${data.chatId}`);
    } catch (error) {
      console.error("Error starting private chat:", error);
      alert("Failed to start private chat. Please ensure the username exists.");
    } finally {
      setShowPrivateChatForm(false);
      setPrivateChatUsername("");
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
  };

  const handleRequestGroup = () => {
    navigate("/createGroup");
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
              <h3>{chat.chat_name}</h3>
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
          Search Group
        </button>
        <button
          className="private-chat-button"
          onClick={() => setShowPrivateChatForm(true)}
        >
          Start Private Chat
        </button>
        {showPrivateChatForm && (
        <div className="private-chat-form">
          <form onSubmit={handlePrivateChatSubmit}>
            <label>
              Enter Username:
              <input
                type="text"
                value={privateChatUsername}
                onChange={(e) => setPrivateChatUsername(e.target.value)}
                required
              />
            </label>
            <div className="form-actions">
              <button type="submit">Start Chat</button>
              <button
                type="button"
                onClick={() => setShowPrivateChatForm(false)}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
        
      </div>
    </div>
  );
};

export default Chats;
