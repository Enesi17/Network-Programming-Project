// import React, { useEffect, useState } from 'react';
// import { useNavigate } from 'react-router-dom';
// import { useUser } from '../context/UserContext';
// import AdminDashboard from './AdminDashboard';
// import ChatList from './ChatList';
// import '../index.css';

// const Profile = () => {
//   const { user } = useUser(); 
//   const [profile, setProfile] = useState(null);
//   const [chats, setChats] = useState([]);
//   const navigate = useNavigate();

//   useEffect(() => {
//     // Fetch profile data and chat list based on user ID
//     if (user) {
//       fetchProfile(user.user_id);
//       fetchUserChats(user.user_id);
//     }
//   }, [user]);

//   // Fetch profile data by user ID
//   const fetchProfile = async (userId) => {
//     try {
//       const response = await fetch(`/api/profile/${userId}`);
//       const data = await response.json();
//       setProfile(data);
//     } catch (error) {
//       console.error("Error fetching profile:", error);
//     }
//   };

//   // Fetch user's chat list
//   const fetchUserChats = async (userId) => {
//     try {
//       const response = await fetch(`/api/chats/${userId}`);
//       const data = await response.json();
//       setChats(data);
//     } catch (error) {
//       console.error("Error fetching chats:", error);
//     }
//   };

//   // Handle navigation to ChatList component to join new chats
//   const handleJoinChats = () => {
//     navigate('/chatlist');
//   };

//   return (
//     <div className="profile-container">
//       <h2>Welcome, {profile ? profile.username : user.username}!</h2>
      
//       {/* Profile Information */}
//       {profile && (
//         <div className="profile-details">
//           <p><strong>Bio:</strong> {profile.bio}</p>
//           <p><strong>Address:</strong> {profile.address}</p>
//           <p><strong>Profession:</strong> {profile.profession}</p>
//           <p><strong>Education:</strong> {profile.education_level}</p>
//         </div>
//       )}

//       {/* User Chat List */}
//       <div className="chat-section">
//         <h3>Your Chats</h3>
//         <ul>
//           {chats.map((chat) => (
//             <li key={chat.chat_id}>{chat.chat_name}</li>
//           ))}
//         </ul>
//         <button onClick={handleJoinChats}>Join New Chats</button>
//       </div>

//       {/* Admin Dashboard for Admin Users */}
//       {user.role === 'admin' && (
//         <div className="admin-dashboard">
//           <h3>Admin Dashboard</h3>
//           <AdminDashboard />
//         </div>
//       )}
//     </div>
//   );
// };

// export default Profile;


import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import AdminDashboard from './AdminDashboard';
import ChatList from './ChatList';
import '../index.css';

const Profile = () => {
  // Mock or fallback user data if user is not set in context
  const { user } = useUser() || { user: { user_id: 1, username: "mockUser", role: "user" } };
  const currentUser = user || { user_id: 1, username: "mockUser", role: "user" }; // Ensure user has a value
  const [profile, setProfile] = useState({
    username: "mockUser",
    bio: "This is a mock bio",
    address: "123 Mock St",
    profession: "Developer",
    education_level: "Bachelor's Degree"
  });
  const [chats, setChats] = useState([
    { chat_id: 1, chat_name: "Broadcast Chat" },
    { chat_id: 2, chat_name: "Group Chat 1" },
    { chat_id: 3, chat_name: "Private Chat with Alice" }
  ]);
  const navigate = useNavigate();

  useEffect(() => {
    // Mock fetch simulation; no API calls, just sets mock data
  }, []);

  // Handle navigation to ChatList component to join new chats
  const handleJoinChats = () => {
    navigate('/chatlist');
  };

  return (
    <div className="profile-container">
      <h2>Welcome, {profile.username}!</h2>
      
      {/* Profile Information */}
      <div className="profile-details">
        <p><strong>Bio:</strong> {profile.bio}</p>
        <p><strong>Address:</strong> {profile.address}</p>
        <p><strong>Profession:</strong> {profile.profession}</p>
        <p><strong>Education:</strong> {profile.education_level}</p>
      </div>

      {/* User Chat List */}
      <div className="chat-section">
        <h3>Your Chats</h3>
        <ul>
          {chats.map((chat) => (
            <li key={chat.chat_id}>{chat.chat_name}</li>
          ))}
        </ul>
        <button onClick={handleJoinChats}>Join New Chats</button>
      </div>
          <div>
            <ChatList />
          </div>
      {/* Admin Dashboard for Admin Users */}
      {currentUser.role === 'admin' && (
        <div className="admin-dashboard">
          <h3>Admin Dashboard</h3>
          <AdminDashboard />
        </div>
      )}
    </div>
  );
};

export default Profile;

