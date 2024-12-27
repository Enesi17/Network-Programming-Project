import React, { useState, useEffect } from "react";

const AdminChatList = () => {
    const [chats, setChats] = useState([]);

    useEffect(() => {
      const fetchChats = async () => {
        try {
          const response = await fetch("http://localhost:5000/admin/chats");
          const data = await response.json();
          setChats(data);
        } catch (error) {
          console.error("Error fetching chats:", error);
        }
      };
      fetchChats();
    }, []);
  
    return (
      <div className="chat-list-container">
        <h2 className="chat-list-title">Chat List</h2>
        <div className="chat-cards">
          {chats.map((chat) => (
            <div key={chat.chat_id} className="chat-card">
              <div className="chat-info">
                <p className="chat-name">{chat.chat_name}</p>
                <p className="chat-creator">Created by: {chat.created_by}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
    
  };
 
export default AdminChatList;