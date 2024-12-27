import React from 'react';
import { Route, Routes } from 'react-router-dom';

import './index.css';

import Home from './components/Home.js';
import Login from './components/Login.js';
import Signup from './components/Signup.js';
import Chats from './components/Chats.js';
import ChatRoom from './components/ChatRoom.js';
import CreateGroup from './components/CreateGroup.js';
import AdminDashboard from './components/AdminDashboard.js';
import AdminAddNewUser from './components/AdminAddNewUser.js';
import AdminChatList from './components/AdminChatList.js';
import AdminUserList from './components/AdminUserList.js';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/admindashboard" element={<AdminDashboard />} />
      <Route path="/chats" element={<Chats />} />
      <Route path="/chatroom/:chatId" element={<ChatRoom />} />
      <Route path="/createGroup" element={<CreateGroup />} />
      <Route path="/addNewUser" element={<AdminAddNewUser />} />
      <Route path="/chatList" element={<AdminChatList />} />
      <Route path="/userList" element={<AdminUserList />} />
    </Routes>
  );
}

export default App;
