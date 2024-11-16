import React from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Home from './components/Home';
import Login from './components/Login';
import Signup from './components/Signup';
import Chats from './components/Chats';
// import Profile from './components/Profile';
// import ChatRoom from './components/ChatRoom';
// import AddUser from './components/dashboard/NewUser';
// import UserList from './components/dashboard/UsersList';
// import AdminDashboard from './components/AdminDashboard';


function App() {
  return (
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/login" element={<Login />} />
        <Route path="/chats" element={<Chats />} />
        {/*  <Route path="/profile" element={<Profile />} />
        <Route path="/chatroom/:id" element={<ChatRoom />} />
        <Route path="/add-user" element={<AddUser />} />
        <Route path="/user-list" element={<UserList />} />
        <Route path="/admin-dashboard" element={<AdminDashboard />} />
        <Route path="/chats/:chatId" element={<ChatRoom />} /> */}
      </Routes>
  );
}

export default App;
