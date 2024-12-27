import React, { useState } from "react";

const AdminAddNewUser = () => {
    const [formData, setFormData] = useState({
        username: "",
        password: "",
        confirmPassword: "",
        email: "",
      });
      const [errorMessage, setErrorMessage] = useState("");
      const [successMessage, setSuccessMessage] = useState("");
    
      const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
      };
    
      const handleAddUser = async (e) => {
        e.preventDefault();
        setErrorMessage("");
        setSuccessMessage("");
    
        const { username, password, confirmPassword, email } = formData;
    
        // Validate input
        if (!username || !password || !confirmPassword || !email) {
          setErrorMessage("All fields are required.");
          return;
        }
    
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
            setSuccessMessage("User added successfully!");
            setFormData({
              username: "",
              password: "",
              confirmPassword: "",
              email: "",
            });
          } else {
            setErrorMessage(data.error || "Failed to add user.");
          }
        } catch (error) {
          setErrorMessage("An error occurred during user registration.");
        }
      };
    
      return (
        <div className="add-user-container">
          <h2 className="add-user-title">Add New User</h2>
          {errorMessage && <p className="error-message">{errorMessage}</p>}
          {successMessage && <p className="success-message">{successMessage}</p>}
          <form className="add-user-form" onSubmit={handleAddUser}>
            <div className="form-group">
              <input
                type="text"
                name="username"
                placeholder="Username"
                value={formData.username}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <input
                type="email"
                name="email"
                placeholder="Email"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <input
                type="password"
                name="password"
                placeholder="Password"
                value={formData.password}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <input
                type="password"
                name="confirmPassword"
                placeholder="Confirm Password"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
              />
            </div>
            <button className="button" type="submit">Add User</button>
          </form>
        </div>
      );
      
    };
    

export default AdminAddNewUser;
