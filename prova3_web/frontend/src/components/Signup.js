import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../index.css"; 

const Signup = () => {
    const navigate = useNavigate();

    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [email, setEmail] = useState("");
    const [errorMessage, setErrorMessage] = useState("");
    const [successMessage, setSuccessMessage] = useState("");

    const handleSignup = async (e) => {
        e.preventDefault();
        
        // Clear previous messages
        setErrorMessage("");
        setSuccessMessage("");

        // Validate passwords match
        if (password !== confirmPassword) {
            setErrorMessage("Passwords do not match.");
            return;
        }

        try {
            const response = await fetch("http://localhost:5000/register", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    username,
                    password,
                    email,
                }),
            });

            const data = await response.json();

            if (response.ok) {
                setSuccessMessage("Registration successful!");
                setTimeout(() => navigate("/login"), 2000); // Redirect after success
            } else {
                setErrorMessage(data.error || "Registration failed.");
            }
        } catch (error) {
            setErrorMessage("An error occurred during registration.");
        }
    };

    const handleBack = () => {
        navigate("/login");
    };

    return (
        <div className="signup-container">
            <h2 className="h2_signup">Sign Up</h2>
            {errorMessage && <p className="error-message">{errorMessage}</p>}
            {successMessage && <p className="success-message">{successMessage}</p>}
            <form onSubmit={handleSignup}>
                <div className="form-group">
                    <label htmlFor="username">Username</label>
                    <input
                        type="text"
                        id="username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="password">Password</label>
                    <input
                        type="password"
                        id="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="confirmPassword">Confirm Password</label>
                    <input
                        type="password"
                        id="confirmPassword"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="email">Email</label>
                    <input
                        type="email"
                        id="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                </div>
                <div className="button-group">
                    <button type="submit" className="signup-button">
                        Sign Up
                    </button>
                    <button onClick={handleBack} className="back-button">
                        Back
                    </button>
                </div>
            </form>
        </div>
    );
};

export default Signup;
