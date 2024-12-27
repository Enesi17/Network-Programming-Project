import React from "react";
import { useNavigate } from "react-router-dom";
import "../index.css";

const Home = () => {
  const navigate = useNavigate();

  return (
    <div className="home-container">
      <header className="hero-overlay">
        <div className="hero-content">
          <h1>
            Welcome to <span className="highlight">SecureChat Pro</span>
          </h1>
          <p className="intro">
            Your private, secure messaging platform. Experience powerful, encrypted communication
            tailored for privacy-conscious users.
          </p>
          <button
            onClick={() => navigate("/login")}
            className="login-button"
            aria-label="Get Started with SecureChat Pro"
          >
            Get Started
          </button>
        </div>
      </header>
      <main className="features">
        <h2>Why Choose SecureChat Pro?</h2>
        <ul className="feature-list">
          <li>
            <p className="feature-detail">
              SecureChat Pro uses advanced technology to protect your conversations. With room-based
              chats, private messaging, and admin tools, enjoy complete control over your
              interactions.
            </p>
          </li>
          <li>
            <p className="feature-detail">
              Built with cutting-edge socket programming and secure protocols, we prioritize your
              privacy and security at every step.
            </p>
          </li>
        </ul>
      </main>
      <footer className="footer">
        <p>
          We’d love to hear from you! Contact us and share your feedback at:{" "}
          <a href="mailto:help@schat.com" aria-label="Contact SecureChat support">
            help@schat.com
          </a>
        </p>
      </footer>
    </div>
  );
};

export default Home;
