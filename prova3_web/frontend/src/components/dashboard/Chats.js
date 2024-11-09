import React, { useEffect, useState } from "react";

const Chats = () => {
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchChats = async () => {
      try {
        const response = await fetch("http://localhost:5000/chats"); // API call to fetch chats
        if (!response.ok) {
          throw new Error("Failed to load chatrooms");
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
  }, []);

  const handleChatClick = (chatId) => {
    localStorage.setItem("chatId", chatId); // Store selected chatId
    window.location.pathname = `/chats/${chatId}`; // Redirect to chat page
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
            <div key={chat.id} className="chat-item">
              <div className="chat-info">
                <h3>{chat.name}</h3>
                <span className="chat-type">({chat.type})</span>
                {chat.created_by && <p className="created-by">Created by: {chat.created_by}</p>}
              </div>
              <button
                onClick={() => handleChatClick(chat.id)}
                className="open-chat-button"
              >
                Open
              </button>
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
