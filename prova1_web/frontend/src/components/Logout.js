import React from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "./UserContext";

const Logout = () => {
  const { logout } = useUser();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout(); // Clears user data from context and localStorage
    navigate("/");
  };

  return (
    <button onClick={handleLogout} className="logout-button">
      Log Out
    </button>
  );
};

export default Logout;
