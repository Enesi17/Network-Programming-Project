import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const CreateGroup = () => {
  const [groupName, setGroupName] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [searchResults, setSearchResults] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (groupName.trim().length > 0) {
      const debounceTimeout = setTimeout(() => fetchGroupSuggestions(groupName), 500); // Debounce input
      return () => clearTimeout(debounceTimeout);
    } else {
      setSuggestions([]);
      setSearchResults(null);
    }
  }, [groupName]);

  const fetchGroupSuggestions = async (query) => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`http://localhost:5000/search-group?name=${query}`);
      const data = await response.json();
      setLoading(false);
      if (response.ok) {
        setSuggestions(data.groups || []); // Assuming the API returns an array of groups
      } else {
        setSuggestions([]);
      }
    } catch (err) {
      console.error("Error fetching group suggestions:", err);
      setLoading(false);
    }
  };

  const handleJoin = async (groupId) => {
    const userId = localStorage.getItem("userId");
    if (!userId) {
      setError("You must be logged in to join a group.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`http://localhost:5000/join-group`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          groupId,
          userId: parseInt(userId, 10),
        }),
      });

      const data = await response.json();
      setLoading(false);

      if (response.ok) {
        alert("You have joined the group successfully!");
        navigate("/chats");
      } else {
        setError(data.message || "Failed to join group.");
      }
    } catch (err) {
      console.error("Join Group Error:", err);
      setError("Failed to join group.");
      setLoading(false);
    }
  };

  const handleCreateGroup = async () => {
    const userId = localStorage.getItem("userId");
    if (!userId) {
      setError("You must be logged in to create a group.");
      return;
    }

    setCreating(true);
    setError("");
    try {
      const response = await fetch(`http://localhost:5000/create-group`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          groupName,
          userId: parseInt(userId, 10),
        }),
      });

      const data = await response.json();
      setCreating(false);
      if (response.ok) {
        alert("Group created successfully!");
        navigate("/chats");
      } else {
        setError(data.message || "Failed to create group.");
      }
    } catch (err) {
      console.error("Create Group Error:", err);
      setError("Failed to create group.");
      setCreating(false);
    }
  };

  const handleBack = () => navigate("/chats");

  return (
    <div className="create-group-container">
      <h1>Create or Search Groups</h1>
      {error && <p className="error-message">{error}</p>}
      <div className="input-section">
        <input
          type="text"
          placeholder="Enter group name"
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
          className="group-input"
        />
        {loading && <p className="loading-message">Searching...</p>}
        {suggestions.length > 0 && (
          <ul className="suggestion-list">
            {suggestions.map((group) => (
              <li key={group.id} className="suggestion-item">
                <span>{group.name}</span>
                <button
                  className="join-button"
                  onClick={() => handleJoin(group.id)}
                >
                  Join
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {!loading && suggestions.length === 0 && groupName && (
        <div className="no-results">
          <p>No results found for "{groupName}".</p>
          <button
            onClick={handleCreateGroup}
            disabled={creating}
            className="create-button"
          >
            {creating ? "Creating..." : "Create Group"}
          </button>
        </div>
      )}
      <button onClick={handleBack} className="back-button">
        Back
      </button>
    </div>
  );
};

export default CreateGroup;
