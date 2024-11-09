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
        // Simulate API delay
        await new Promise((resolve) => setTimeout(resolve, 500));

        // Mock data for chats
        const mockData = isAdmin
          ? [
              { id: 1, name: "Admin Chatroom 1", type: "Admin", lastMessage: "Last message in Admin Chatroom 1" },
              { id: 2, name: "Admin Chatroom 2", type: "Admin", lastMessage: "Last message in Admin Chatroom 2" },
              { id: 3, name: "Admin Chatroom 3", type: "Admin", lastMessage: "Last message in Admin Chatroom 3" }
            ]
          : [
              { id: 4, name: "User Chatroom 1", type: "User", lastMessage: "Last message in User Chatroom 1" },
              { id: 5, name: "User Chatroom 2", type: "User", lastMessage: "Last message in User Chatroom 2" },
              { id: 6, name: "User Chatroom 3", type: "User", lastMessage: "Last message in User Chatroom 3" }
            ];

        setChats(mockData);
      } catch (err) {
        setError("Failed to load chatrooms");
      } finally {
        setLoading(false);
      }
    };

    fetchChats();
  }, [isAdmin]);

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
              </div>
              <button
                onClick={() => handleChatClick(chat.id)}
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
