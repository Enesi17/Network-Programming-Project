import React from "react";
import { Routes, Route } from "react-router-dom";
import "./index.css";
import Home from "./components/Home";
import Login from "./components/Login";
import Signup from "./components/Signup";
import Profile from "./components/Profile";
import Chats from "./components/Chats";
import Chat from "./components/Chat";
import Admin from "./components/Admin";

function App() {
  const isAdmin = localStorage.getItem("isAdmin") === "true";

  return (
    <div className="App">
      <header className="App-header">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/profile" element={isAdmin ? <Admin /> : <Profile />} />
          <Route path="/chats" element={<Chats />} />
          <Route path="/chats/:chatId" element={<Chat />} /> {/* Dynamic route for specific chat */}
        </Routes>
      </header>
    </div>
  );
}

export default App;
