import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

import "../index.css"; 

const Signup = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        username: "",
        password: "",
        confirmPassword: "",
        email: "",
    });
    const [errorMessage, setErrorMessage] = useState("");
    const [successMessage, setSuccessMessage] = useState("");
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };
    const handleSignup = async (e) => {
        e.preventDefault();
        setErrorMessage("");
        setSuccessMessage("");

        const { username, password, confirmPassword, email } = formData;

        if (password !== confirmPassword) {
            setErrorMessage("Passwords do not match.");
            return;
        }

        if (!email.includes("@")) {
            setErrorMessage("Invalid email address.");
            return;
        }
        try {
            const response = await fetch("http://localhost:5000/register", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ username, password, email }),
            });

            const data = await response.json();

            if (response.ok) {
                setSuccessMessage("Registration successful!");
                setTimeout(() => navigate("/login"), 2000);
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
                        name="username"
                        value={formData.username}
                        onChange={handleInputChange}
                        required
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="email">Email</label>
                    <input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        required
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="password">Password</label>
                    <input
                        type="password"
                        id="password"
                        name="password"
                        value={formData.password}
                        onChange={handleInputChange}
                        required
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="confirmPassword">Confirm Password</label>
                    <input
                        type="password"
                        id="confirmPassword"
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleInputChange}
                        required
                    />
                </div>
                <div className="button-group">
                    <button type="submit" className="signup-button">
                        Sign Up
                    </button>
                    <button type="button" onClick={handleBack} className="back-button">
                        Back
                    </button>
                </div>
            </form>
        </div>
    );
};

export default Signup;
