import React from 'react';
import { Route, Routes } from 'react-router-dom';

import './index.css';

import Home from './components/Home.js';
import Login from './components/Login.js';
import Signup from './components/Signup.js';
import Chats from './components/Chats.js';
import ChatRoom from './components/ChatRoom.js';
import Test from './components/Test.js';
import CreateGroup from './components/CreateGroup.js';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/chats" element={<Chats />} />
      <Route path="/chatroom/:chatId" element={<ChatRoom />} />
      <Route path="/createGroup" element={<CreateGroup />} />
    </Routes>
  );
}

export default App;
