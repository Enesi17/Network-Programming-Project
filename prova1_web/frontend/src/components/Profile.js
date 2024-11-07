import React, { useEffect, useState } from "react";
import Logout from "./Logout";
import Chats from "./Chats";
import { useUser } from "./UserContext";

const Profile = () => {
    const [userData, setUserData] = useState(null);
    const [adminData, setAdminData] = useState(null); // Additional state for admin data
    const [chats, setChats] = useState([]);
    const { user } = useUser();
    const userId = localStorage.getItem("userId");

    const fetchUserProfile = async () => {
        try {
            const response = await fetch(`http://localhost:5000/profile/${userId}`);
            const data = await response.json();
            setUserData(data);
            if (data.role_id === 1) {  // Check if the user is an admin
                setAdminData(data.usersList);
                fetchAllChats(); // Fetch all chats for admins
            }
        } catch (error) {
            console.error("Error fetching profile data:", error);
        }
    };

    const fetchAllChats = async () => {
        try {
            const response = await fetch(`http://localhost:5000/admin/chats`);
            const data = await response.json();
            setChats(data);
        } catch (error) {
            console.error("Error fetching chats:", error);
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
            fetchUserProfile(); // Refresh the list after banning
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
            <div className="profile-left">
                <img src="https://via.placeholder.com/100" alt="Profile" className="profile-pic" />
                <h2>{userData.username}</h2>
                <p>Email: {userData.email}</p>
                <p>Phone: {userData.phone}</p>
                <p>Bio: {userData.bio}</p>
                <p>Address: {userData.address}</p>
                <p>Profession: {userData.profession}</p>
            </div>
            <div className="profile-middle">
                <button onClick={() => (window.location.pathname = "/chats")}>Go to Chats</button>
                {userData.role_id === 1 && (
                    <>
                        <h3>Admin Actions</h3>
                        <h4>Users List</h4>
                        {adminData?.map((adminUser) => (
                            <div key={adminUser.user_id}>
                                <p>{adminUser.username} ({adminUser.role_id === 1 ? "Admin" : "User"})</p>
                                <button onClick={() => banUser(adminUser.user_id)}>Ban User</button>
                            </div>
                        ))}
                        <h4>Chat Rooms</h4>
                        {chats.map((chat) => (
                            <p key={chat.id}>{chat.name}</p>
                        ))}
                    </>
                )}
                <Logout />
            </div>
        </div>
    );
};

export default Profile;
