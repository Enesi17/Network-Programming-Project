import React, { useEffect, useState } from "react";
import Logout from "./Logout";
import { useUser } from "../UserContext";

const Profile = () => {
    const [userData, setUserData] = useState(null);
    const [adminData, setAdminData] = useState(null);
    const [chats, setChats] = useState([]);
    const { user } = useUser();
    const userId = localStorage.getItem("userId");

    const fetchUserProfile = async () => {
        try {
            const response = await fetch(`http://localhost:5000/profile/${userId}`);
            const data = await response.json();
            setUserData(data);
            if (data.role_id === 1) {
                fetchAllChats(); // Fetch all chats if admin
            } else {
                fetchUserChats(); // Fetch only joined chats if regular user
            }
        } catch (error) {
            console.error("Error fetching profile data:", error);
        }
    };

    const fetchAllChats = async () => {
        try {
            const response = await fetch(`http://localhost:5000/chats`);
            const data = await response.json();
            setChats(data);
        } catch (error) {
            console.error("Error fetching all chats:", error);
        }
    };

    const fetchUserChats = async () => {
        try {
            const response = await fetch(`http://localhost:5000/user-chats/${userId}`);
            const data = await response.json();
            setChats(data);
        } catch (error) {
            console.error("Error fetching user chats:", error);
        }
    };

    const banUser = async (banUserId) => {
        try {
            const response = await fetch(`http://localhost:5000/admin/users/${banUserId}`, {
                method: "DELETE",
            });
            if (!response.ok) {
                console.error("Failed to ban user");
                return;
            }
            console.log("User banned successfully");
            fetchUserProfile(); // Refresh the profile list after banning
        } catch (error) {
            console.error("Error banning user:", error);
        }
    };

    useEffect(() => {
        if (!userId) return;
        fetchUserProfile();
    }, [userId]);

    if (!userData) return <div>Loading...</div>;

    return (
        <div className="profile-container">
            {/* Left panel with profile picture and username */}
            <div className="profile-left">
                <img src="https://via.placeholder.com/100" alt="Profile" className="profile-pic" />
                <h2>{userData.username}</h2>
            </div>

            {/* Middle panel with profile details */}
            <div className="profile-middle">
                <div className="profile-details">
                    <h3>Profile Information</h3>
                    <p>Email: {userData.email}</p>
                    <p>Phone: {userData.phone}</p>
                    <p>Bio: {userData.bio}</p>
                    <p>Address: {userData.address}</p>
                    <p>Profession: {userData.profession}</p>
                </div>
                <button onClick={() => (window.location.pathname = "/chats")}>Go to Chats</button>
                <Logout />
            </div>

            {/* Right panel with chat list or admin actions */}
            <div className="profile-right">
                {userData.role_id === 1 ? (
                    <>
                        <h3>Admin Actions</h3>
                        <div className="admin-actions">
                            <button onClick={() => console.log("View All Chats")}>View All Chats</button>
                            <button onClick={() => console.log("Manage Users")}>Manage Users</button>
                            <button onClick={() => console.log("Add New User")}>Add New User</button>
                        </div>
                        <div className="chats-list">
                            {chats.map((chat) => (
                                <p key={chat.chat_id}>{chat.name} ({chat.type})</p>
                            ))}
                        </div>
                    </>
                ) : (
                    <>
                        <h3>Your Chats</h3>
                        <div className="chats-list">
                            {chats.map((chat) => (
                                <p key={chat.chat_id}>{chat.name} ({chat.type})</p>
                            ))}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default Profile;
