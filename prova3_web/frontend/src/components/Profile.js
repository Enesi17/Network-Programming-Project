import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import '../index.css';

const Profile = () => {
  const { user } = useUser(); 
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [chats, setChats] = useState([]);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (user) {
      fetchProfile(user.userId);
      fetchChats(user.userId);
    }else{
      navigate("/login");
    }
  }, [user, navigate]);

  const fetchProfile = async (userId) => {
    try {
      const response = await fetch(`http://localhost:5000/profile/${userId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch profile data");
      }
      const data = await response.json();
      setProfile(data);
    } catch (error) {
      setErrorMessage(error.message);
    }
  };

  const fetchChats = async (userId) => {
    try {
      const response = await fetch(`http://localhost:5000/user/${userId}/chatrooms`);
      if (!response.ok) {
        throw new Error("Failed to fetch chatrooms");
      }
      const data = await response.json();
      setChats(data);
    } catch (error) {
      setErrorMessage(error.message);
    }
  };

  const handleJoinChats = () => {
    navigate('/chat-list');
  };

  const handleAdminDashboard = () => {
    navigate('/admin-dashboard');
  };

  if (!user) return null;


  return (
    
    <div className="profile-container">
      
      <h2>Welcome, {profile ? profile.username : user.username}!</h2>
      {errorMessage && <p className="error-message">{errorMessage}</p>}

      {/* Profile Information */}
      {profile ? (
        <div className="profile-details">
          <p><strong>Bio:</strong> {profile.bio}</p>
          <p><strong>Address:</strong> {profile.address}</p>
          <p><strong>Profession:</strong> {profile.profession}</p>
          <p><strong>Education:</strong> {profile.education_level}</p>
        </div>
      ) : (
        <p>Loading profile...</p>
      )}

      {/* User Chat List */}
      <div className="chat-section">
        <h3>Your Chats</h3>
        <ul>
          {chats.length > 0 ? (
            chats.map((chat) => (
              <li key={chat.chat_id}>{chat.chat_name}</li>
            ))
          ) : (
            <p>No chatrooms available.</p>
          )}
        </ul>
        <button onClick={handleJoinChats}>Join New Chats</button>
      </div>

      {/* Admin Dashboard Button for Admin Users */}
      {user.role_id === 1 && (
        <button onClick={handleAdminDashboard} className="admin-dashboard-button">
          Go to Admin Dashboard
        </button>
      )}
    </div>
  );
};

export default Profile;
