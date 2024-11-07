import React, { useEffect, useState, toggleEditMode } from "react";
import Logout from "./Logout";
import Chats from "./Chats";
import "../index.css";

const Admin = () => {
    const [userData, setUserData] = useState(null);
    const [errorMessage, setErrorMessage] = useState("");
    const [editMode, setEditMode] = useState({});
    const [updatedData, setUpdatedData] = useState({});
    const [usersList, setUsersList] = useState([]);
    const [newUser, setNewUser] = useState({ username: "", email: "", password: "" });

    const userId = localStorage.getItem('userId');

    const fetchUserProfile = async () => {
        try {
            const response = await fetch(`http://localhost:5000/profile/${userId}`);
            if (!response.ok) {
                console.error("Fetch error:", await response.text());
                return;
            }
            const data = await response.json();
            setUserData(data);
        } catch (error) {
            console.error("Error fetching profile data:", error);
        }
    };

    const fetchUsersList = async () => {
        try {
            const response = await fetch("http://localhost:5000/admin/users");
            const data = await response.json();
            setUsersList(data);
        } catch (error) {
            console.error("Error fetching users list:", error);
        }
    };

    useEffect(() => {
        if (!userId) {
            console.error("User ID is not available.");
            return;
        }
        fetchUserProfile();
        fetchUsersList();
    }, [userId]);

    const editUserProfile = async (field, value) => {
        const endpointMap = {
            phone: `/profile/${userId}/phone`,
            bio: `/profile/${userId}/bio`,
            address: `/profile/${userId}/address`,
            profession: `/profile/${userId}/profession`
        };
    
        try {
            const response = await fetch(`http://localhost:5000${endpointMap[field]}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ [field]: value })
            });
    
            if (!response.ok) {
                console.error("Update error:", await response.text());
                return;
            }
    
            const result = await response.json();
            fetchUserProfile();
        } catch (error) {
            console.error(`Error updating ${field}:`, error);
        }
    };

    const banUser = async (userId) => {
        try {
            await fetch(`http://localhost:5000/admin/ban/${userId}`, { method: "PATCH" });
            fetchUsersList();
        } catch (error) {
            console.error("Error banning user:", error);
        }
    };

    const deleteUser = async (userId) => {
        try {
            await fetch(`http://localhost:5000/admin/users/${userId}`, { method: "DELETE" });
            fetchUsersList();
        } catch (error) {
            console.error("Error deleting user:", error);
        }
    };

    const createChatRoom = async () => {
        try {
            const response = await fetch("http://localhost:5000/admin/create-chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: "New Chat Room" }) // Replace with dynamic input as needed
            });
            if (response.ok) fetchUsersList();
        } catch (error) {
            console.error("Error creating chat room:", error);
        }
    };

    const handleNewUserInput = (field, value) => {
        setNewUser((prevData) => ({ ...prevData, [field]: value }));
    };

    const addNewUser = async () => {
        try {
            await fetch("http://localhost:5000/admin/add-user", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(newUser)
            });
            fetchUsersList();
        } catch (error) {
            console.error("Error adding new user:", error);
        }
    };

    return (
        <div className="admin-container">
            <div className="profile-container">
                <div className="profile-left">
                    <h2 className="p_login">Admin Dashboard</h2>
                    <img src="https://via.placeholder.com/100" alt="Profile" className="profile-pic" />
                    <h2>{userData?.username}</h2>
                </div>
                <div className="profile-middle">
                    {/* Similar to Profile fields */}
                    {["phone", "address", "bio", "profession"].map((field) => (
                        <div key={field} className="info-section">
                            <p className="p_login"><strong>{field.charAt(0).toUpperCase() + field.slice(1)}:</strong> {userData?.[field]}</p>
                            <button onClick={() => toggleEditMode(field)}>{editMode[field] ? "Save" : "Edit"}</button>
                        </div>
                    ))}
                    <div className="profile-actions">
                        <button onClick={() => (window.location.pathname = "/chats")} className="chats-button">
                            Go to Chats
                        </button>
                        <Logout />
                    </div>
                </div>
            </div>

            <div className="admin-right">
                <h3>Manage Users</h3>
                <div>
                    {usersList.map(user => (
                        <div key={user.id} className="user-entry">
                            <span>{user.username} - {user.email}</span>
                            <button onClick={() => banUser(user.id)}>Ban</button>
                            <button onClick={() => deleteUser(user.id)}>Delete</button>
                        </div>
                    ))}
                </div>

                <h3>Create New Chat Room</h3>
                <button onClick={createChatRoom}>Create Chat Room</button>

                <h3>Add New User</h3>
                <input
                    type="text"
                    placeholder="Username"
                    value={newUser.username}
                    onChange={(e) => handleNewUserInput("username", e.target.value)}
                />
                <input
                    type="email"
                    placeholder="Email"
                    value={newUser.email}
                    onChange={(e) => handleNewUserInput("email", e.target.value)}
                />
                <input
                    type="password"
                    placeholder="Password"
                    value={newUser.password}
                    onChange={(e) => handleNewUserInput("password", e.target.value)}
                />
                <button onClick={addNewUser}>Add User</button>
            </div>
        </div>
    );
};

export default Admin;
