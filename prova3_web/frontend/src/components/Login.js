import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "../context/UserContext.js";
import "../index.css";

const Login = () => {
  const { setUser } = useUser();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMessage(""); // Clear any previous error message

    try {
      const response = await fetch("http://localhost:5000/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username,
          password,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setUser(data); // Set user data in context
        navigate("/profile"); // Redirect after successful login
      } else {
        setErrorMessage(data.error || "Invalid username or password");
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
      {errorMessage && <p className="p_login">{errorMessage}</p>}
      <form onSubmit={handleLogin}>
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
        <button type="submit" className="login-button">
          Login
        </button>
      </form>
      <div className="signup-section">
        <p className="p_login">New user?</p>
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
