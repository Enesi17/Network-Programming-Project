import React, { useState } from "react";
import "../index.css"; 

const Signup = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const handleSignup = async (e) => {
    e.preventDefault();
  
    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      console.log(errorMessage);
      setSuccessMessage("");
      return;
    }
  
    try {
      const response = await fetch("http://localhost:5000/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ username, password, email })
      });
  
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Registration failed");
      }
  
      const data = await response.json();
      setSuccessMessage("Registration successful!");
      setErrorMessage("");
      setUsername("");
      setPassword("");
      setConfirmPassword("");
      setEmail("");
      console.log("registred successful");
      window.location.pathname="/login";
    } catch (error) {
      setErrorMessage(error.message);
    }
  };

  const handleBack = () => {
    window.location.pathname = "/";
  }

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
          <label htmlFor="confirmPassword">Email</label>
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
