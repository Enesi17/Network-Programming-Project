import React from "react";
import { useNavigate } from "react-router-dom";
import "../index.css";

const Home = () => {
  const navigate = useNavigate();

  return (
    <div className="home-container">
      <div className="hero-overlay">
        <div className="hero-content">
          <h1>Welcome to <span className="highlight">SecureChat Pro</span></h1>
          <p className="intro">
            Your private, secure messaging platform. Experience powerful, encrypted communication
            tailored for privacy-conscious users.
          </p>
          <button onClick={() => navigate("/login")} className="login-button">
            Get Started
          </button>
        </div>
      </div>
      <div className="features">
        <h2>Why Choose SecureChat Pro?</h2>
        <p className="feature-detail">
          SecureChat Pro uses advanced technology to protect your conversations. With room-based chats,
          private messaging, and admin tools, enjoy complete control over your interactions.
        </p>
        <p className="feature-detail">
          Built with cutting-edge socket programming and secure protocols, we prioritize your privacy
          and security at every step.
        </p>
      </div>
      <footer className="footer">
        <p>We’d love to hear from you! Contact us and share your feedback at: <a href="mailto:help@schat.com">help@schat.com</a></p>
      </footer>
    </div>
  );
};

export default Home;
