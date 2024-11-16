import React from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "../context/UserContext.js";

const Logout = () => {
  const { logout } = useUser();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout(); 
    navigate("/");
  };

  return (
    <button onClick={handleLogout} className="logout-button">
      Log Out
    </button>
  );
};

export default Logout;
