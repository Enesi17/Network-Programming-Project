import React, { useState } from "react";
import AdminUserList from "./AdminUserList"; 
import AdminChatList from "./AdminChatList"; 
import AdminAddNewUser from "./AdminAddNewUser";
import { useNavigate } from "react-router-dom";

import "../index.css";


const AdminDashboard = () => {
  const [currentView, setCurrentView] = useState("default");
  const navigate = useNavigate();

  
  const handleChatsClick = () => navigate("/chats");
  const handleUserListClick = () => setCurrentView("userList");
  const handleChatListClick = () => setCurrentView("chatList");
  const handleAddNewUserClick = () => setCurrentView("addNewUser");
  const handleLogoutClick = () => {
    localStorage.clear();
    navigate("/login");
  };

  return (
    <div className="admin-dashboard">
      <h1>Admin Dashboard</h1>
      <div className="dashboard-buttons">
        <button onClick={handleChatsClick}>Chats</button>
        <button onClick={handleUserListClick}>User List</button>
        <button onClick={handleChatListClick}>Chat List</button>
        <button onClick={handleAddNewUserClick}>Add New User</button>
        <button onClick={handleLogoutClick} className="logout-button">
          Logout
        </button>
      </div>
  
      <div className="dashboard-content">
        {currentView === "userList" && <AdminUserList />}
        {currentView === "chatList" && <AdminChatList />}
        {currentView === "addNewUser" && <AdminAddNewUser />}
        {currentView === "default" && <p>Welcome! Please select an option above to begin.</p>}
      </div>
    </div>
  );
};

export default AdminDashboard;
