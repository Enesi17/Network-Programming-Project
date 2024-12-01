import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "../context/UserContext.js";
import "../index.css";

const Login = () => {
  const { setUser } = useUser(); // Assume useUser manages global user state
  const navigate = useNavigate();

  const [credentials, setCredentials] = useState({
    username: "",
    password: "",
  });
  const [errorMessage, setErrorMessage] = useState("");

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCredentials({ ...credentials, [name]: value });
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMessage(""); // Clear previous error message

    try {
      const response = await fetch("http://localhost:5000/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(credentials),
      });

      const data = await response.json();

      if (response.ok) {
        // Store token securely
        localStorage.setItem("token", data.token); // JWT token
        localStorage.setItem("userId", data.userId);
        localStorage.setItem("username", data.username);
        localStorage.setItem("role", data.role); // Store role for role-based navigation

        // Set user context (if used)
        setUser({
          userId: data.userId,
          username: data.username,
          role: data.role,
          token: data.token,
        });

        // Navigate based on user role
        if (data.role === "admin") {
          navigate("/admin/dashboard");
        } else {
          navigate("/chats");
        }
      } else {
        setErrorMessage(data.error || "Invalid username or password.");
      }
    } catch (error) {
      setErrorMessage("An error occurred during login. Please try again.");
    }
  };

  const handleSignup = () => {
    navigate("/signup");
  };

  const handleBack = () => {
    navigate("/");
  };

  return (
    <div className="login-container">
      <h2 className="h2-login">Login</h2>
      {errorMessage && <p className="error-message">{errorMessage}</p>}
      <form onSubmit={handleLogin}>
        <div className="form-group">
          <label htmlFor="username">Username</label>
          <input
            type="text"
            id="username"
            name="username"
            value={credentials.username}
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
            value={credentials.password}
            onChange={handleInputChange}
            required
          />
        </div>
        <button type="submit" className="login-button">
          Login
        </button>
      </form>
      <div className="signup-section">
        <p className="p-login">New user?</p>
        <div className="button-group">
          <button onClick={handleSignup} className="signup-button">
            Sign Up
          </button>
          <button onClick={handleBack} className="back-button">
            Back
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;
