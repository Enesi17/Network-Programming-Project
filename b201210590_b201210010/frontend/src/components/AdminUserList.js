import React, { useState, useEffect } from "react";

const AdminUserList = () => {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch("http://localhost:5000/users");
        const data = await response.json();
        setUsers(data);
      } catch (error) {
        console.error("Error fetching users:", error);
      }
    };
    fetchUsers();
  }, []);

  const handleBanUser = async (userId) => {
    try {
      const response = await fetch(`http://localhost:5000/users/${userId}/ban`, {
        method: "POST",
      });
      if (response.ok) {
        alert("User banned successfully!");
        setUsers(users.filter((user) => user.id !== userId)); // Update UI
      } else {
        alert("Failed to ban user.");
      }
    } catch (error) {
      console.error("Error banning user:", error);
    }
  };

  return (
  <div className="user-list-container">
    <h2 className="user-list-title">User List</h2>
    <div className="user-cards">
      {users.map((user) => (
        <div key={user.id} className="user-card">
          <div className="user-info">
            <p className="user-name">{user.username}</p>
            <p className="user-email">{user.email}</p>
          </div>
        </div>
      ))}
    </div>
  </div>
);

};

export default AdminUserList;
