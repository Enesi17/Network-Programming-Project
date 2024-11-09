import React, { useEffect, useState } from "react";

const Chats = () => {
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const userId = localStorage.getItem("userId");
  const isAdmin = localStorage.getItem("isAdmin") === "true";

  useEffect(() => {
    const fetchChats = async () => {
      try {
        const endpoint = isAdmin
          ? "http://localhost:5000/admin/chats"
          : `http://localhost:5000/user/${userId}/chatrooms`;

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

  const handleChatClick = (chatId) => {
    localStorage.setItem("chatId", chatId); // Store selected chatId
    navigate(`/chatroom/${chatId}`); // Redirect to chat page
  };

  if (loading) {
    return <div>Loading chatrooms...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div className="chats-container">
      <h2>Chats</h2>
      <div className="chats-list">
        {chats.length > 0 ? (
          chats.map((chat) => (
            <div key={chat.chat_id} className="chat-item">
              <div className="chat-info">
                <h3>{chat.name}</h3>
                <span className="chat-type">({chat.type})</span>
              </div>
              <button
                onClick={() => handleChatClick(chat.chat_id)}
                className="open-chat-button"
              >
                Open
              </button>
              <p className="last-message">{chat.lastMessage}</p>
            </div>
          ))
        ) : (
          <p>No chatrooms available.</p>
        )}
      </div>
      <button className="join-group-button">Join Other Groups</button>
    </div>
  );
};

export default Chats;
