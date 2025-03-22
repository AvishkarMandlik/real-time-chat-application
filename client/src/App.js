import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import ChatRooms from './components/ChatRooms';
import RoomList from './components/RoomList';
import CreateRoom from './components/CreateRoom';
import Register from './components/Register';
import VideoChat from './components/VideoChat';

function App() {
  return (
    <Router>
      <Routes>
        {/* <Route path="/register" element={<Navigate to="/rooms" replace />} /> */}
        <Route path="/" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/rooms" element={<RoomList />} />
        <Route path="/rooms/create" element={<CreateRoom />} />
        <Route path="/rooms/:roomId" element={<ChatRooms />} />
        <Route path='/videochat' element={<VideoChat />} />
        <Route path="*" element={<h2 className="text-center">404 - Page Not Found</h2>} />
      </Routes>
    </Router>
  );
}

export default App;
