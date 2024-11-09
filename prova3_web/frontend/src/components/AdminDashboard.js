// AdminDashboard.js
import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../index.css'; // Assuming you add your styling here

const AdminDashboard = () => {
  const navigate = useNavigate();

  return (
    <div className="admin-dashboard">
      <h2>Admin Dashboard</h2>
      <div className="admin-button-grid">
        <button onClick={() => navigate('/add-user')} className="admin-button">
          Add User
        </button>
        <button onClick={() => navigate('/user-list')} className="admin-button">
          User List
        </button>
        <button onClick={() => navigate('/chat-list')} className="admin-button">
          Chat List
        </button>
        <button onClick={() => navigate('/ban-user')} className="admin-button">
          Ban User
        </button>
      </div>
    </div>
  );
};

export default AdminDashboard;
