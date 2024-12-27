import React, { useState } from 'react';
import { useNavigate } from "react-router-dom";
const SearchGroup = () => {
    const [groupName, setGroupName] = useState('');
    const [searchResults, setSearchResults] = useState(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [creating, setCreating] = useState(false);
    const navigate = useNavigate();

    const handleSearchGroup = async () => {
        if (!groupName.trim()) return; // Prevent searching with empty or space-only strings

        setLoading(true);
        setError('');
        try {
            const response = await fetch(`http://localhost:5000/search-group?name=${groupName}`);
            const data = await response.json();
            setLoading(false);
            if (response.ok) {
                setSearchResults(data.group);
            } else {
                setSearchResults(null);
                setError(data.message || 'Group not found, please try a different search.');
            }
        } catch (err) {
            console.error('Search Error:', err);
            setError('Failed to search for groups.');
            setLoading(false);
            setSearchResults(null);
        }
    };

    const handleJoin = async () => {
        const userId = localStorage.getItem('userId'); // Retrieve userId from local storage
        if (!userId) {
            setError('You must be logged in to join a group.');
            return;
        }

        setLoading(true);
        try {
            const response = await fetch(`http://localhost:5000/join-group`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    groupId: searchResults.id,
                    userId: parseInt(userId, 10) // Convert userId to integer if necessary
                })
            });
            const data = await response.json();
            setLoading(false);
            if (response.ok) {
                alert('You have joined the group successfully!');
            } else {
                setError(data.message || 'Failed to join group.');
            }
        } catch (err) {
            console.error('Join Group Error:', err);
            setError('Failed to join group.');
            setLoading(false);
        }
    };

    const handleCreateGroup = async () => {
        const userId = localStorage.getItem('userId'); // Retrieve userId from local storage
        if (!userId) {
            setError('You must be logged in to create a group.');
            return;
        }

        setCreating(true);
        setError('');
        try {
            const response = await fetch(`http://localhost:5000/create-group`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    groupName,
                    userId: parseInt(userId, 10) // Pass group name and user ID
                })
            });

            const data = await response.json();
            setCreating(false);
            if (response.ok) {
                alert('Group created successfully!');
                setSearchResults({ id: data.groupId, name: groupName }); // Simulate search results
            } else {
                setError(data.message || 'Failed to create group.');
            }
        } catch (err) {
            console.error('Create Group Error:', err);
            setError('Failed to create group.');
            setCreating(false);
        }
    };

    const handleBack = () => navigate("/chats");

    return (
        <div>
            <h1>Search Groups</h1>
            {error && <p style={{ color: 'red' }}>{error}</p>}
            <div>
                <input
                    type="text"
                    placeholder="Search for a group"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                />
                <button onClick={handleSearchGroup} disabled={loading || creating}>Search</button>
            </div>
            {searchResults ? (
                <div>
                    <p>Group found: {searchResults.name}</p>
                    <button onClick={handleJoin} disabled={loading}>Join Group</button>
                </div>
            ) : groupName ? (
                <div>
                    <p>No results found for "{groupName}".</p>
                    <button onClick={handleCreateGroup} disabled={creating}>
                        {creating ? 'Creating...' : 'Create Group'}
                    </button>

                    <button onClick={handleBack} className="logout-button">Back</button>
                </div>
            ) : null}
        </div>
    );
};

export default SearchGroup;
