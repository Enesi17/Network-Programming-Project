import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../index.css";

const Home = () => {
  const navigate = useNavigate();
  const [language, setLanguage] = useState("en");

  const toggleLanguage = () => {
    setLanguage((prevLanguage) => (prevLanguage === "en" ? "tr" : "en"));
  };

  const content = {
    en: {
      header: "Welcome to ",
      highlight: "SecureChat Pro",
      intro: "Your private, secure messaging platform. Experience powerful, encrypted communication tailored for privacy-conscious users.",
      button: "Get Started",
      whyChoose: "Why Choose SecureChat Pro?",
      feature1: "SecureChat Pro uses advanced technology to protect your conversations. With room-based chats, private messaging, and admin tools, enjoy complete control over your interactions.",
      feature2: "Built with cutting-edge socket programming and secure protocols, we prioritize your privacy and security at every step.",
      footer: "We’d love to hear from you! Contact us and share your feedback at:",
      contact: "help@schat.com",
    },
    tr: {
      header: "Hoş Geldiniz ",
      highlight: "SecureChat Pro",
      intro: "Özel ve güvenli mesajlaşma platformunuz. Gizliliğe önem veren kullanıcılar için güçlü, şifrelenmiş iletişim deneyimi yaşayın.",
      button: "Başlayın",
      whyChoose: "Neden SecureChat Pro'yu Seçmelisiniz?",
      feature1: "SecureChat Pro, konuşmalarınızı korumak için gelişmiş teknolojiler kullanır. Oda tabanlı sohbetler, özel mesajlaşma ve yönetici araçlarıyla etkileşimleriniz üzerinde tam kontrol sağlayın.",
      feature2: "Son teknoloji soket programlama ve güvenli protokollerle oluşturulmuş olan SecureChat Pro, gizliliğinizi ve güvenliğinizi her adımda önceliklendirir.",
      footer: "Sizden haber almak isteriz! Bizimle iletişime geçin ve geri bildirimlerinizi paylaşın:",
      contact: "help@schat.com",
    },
  };

  const langContent = content[language];

  return (
    <div className="home-container">
      <button onClick={toggleLanguage} className="language-button">
        {language === "en" ? "Türkçe" : "English"}
      </button>
      <header className="hero-overlay">
        <div className="hero-content">
          <h1>
            {langContent.header} <span className="highlight">{langContent.highlight}</span>
          </h1>
          <p className="intro">{langContent.intro}</p>
          <button
            onClick={() => navigate("/login")}
            className="login-button"
            aria-label="{langContent.button}"
          >
            {langContent.button}
          </button>
        </div>
      </header>
      <main className="features">
        <h2>{langContent.whyChoose}</h2>
        <ul className="feature-list">
          <li>
            <p className="feature-detail">{langContent.feature1}</p>
          </li>
          <li>
            <p className="feature-detail">{langContent.feature2}</p>
          </li>
        </ul>
      </main>
      <footer className="footer">
        <p>
          {langContent.footer} <a href={`mailto:${langContent.contact}`}>{langContent.contact}</a>
        </p>
      </footer>
    </div>
  );
};

export default Home;
