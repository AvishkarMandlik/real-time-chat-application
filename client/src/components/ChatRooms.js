import React, { useEffect, useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import Chat from './Chat';
import OnlineUsers from './OnlineUsers';
import Logout from "./Logout";

const socket = io('https://real-time-chat-app-7gqk.onrender.com');

const ChatRooms = (onLogout) => {
  const { roomId } = useParams();
  const location = useLocation();
  const navigate = useNavigate(); // Use navigate for redirection
  const [messages, setMessages] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);

  const username = location.state?.username || localStorage.getItem('username') || 'Anonymous';

  useEffect(() => {
    // const username = location.state?.username || 'Anonymous';
    const username = location.state?.username || localStorage.getItem('username') || 'Anonymous';

    if (!roomId) {
      console.error('Room ID not provided!');
      return;
    }

    // Join room
    socket.emit('joinRoom', { username, room: roomId });

    // Chat history
    socket.on('chatHistory', (history) => setMessages(history));

    // New messages
    socket.on('chatMessage', (message) =>
      setMessages((prevMessages) => [...prevMessages, message])
    );

    // Online users
    socket.on('onlineUsers', (users) => setOnlineUsers(users));

    return () => {
      socket.emit('leaveRoom', { username, room: roomId });
      socket.off(); // Cleanup listeners
    };
  }, [roomId, location.state]);

  // Handle Leave Room
  const leaveRoom = () => {
    const username = location.state?.username || 'Anonymous';
    socket.emit('leaveRoom', { username, room: roomId }); // Notify server
    navigate('/rooms'); // Redirect to the homepage or another route
  };

  return (
<div className="d-flex justify-content-center align-items-center vh-100">
  <div className="container p-4 shadow rounded" style={{ maxWidth: "900px", border: "1px solid #ddd" }}>
    {/* Header Section */}
    <div className="d-flex justify-content-between align-items-center mb-4">
      <h2 className="text-center mb-0">Chat Room: {roomId}</h2>
      {/* Leave Room Button (Styled like Logout) */}
      <button className="btn btn-outline-danger" onClick={leaveRoom}>
        Leave Room
      </button>
    </div>

    {/* Chat and Online Users Layout */}
    <div className="row">
      {/* Chat Section */}
      <div className="col-md-8 mb-3">
        <div
          className="chat-box border rounded p-3 mb-3"
          style={{ height: '300px', overflowY: 'scroll', backgroundColor: '#f8f9fa' }}
        >
          <Chat username={username} messages={messages} socket={socket} room={roomId} />
        </div>
      </div>

      {/* Online Users Section */}
      <div className="col-md-4">
        <div className="card shadow">
          <div className="card-header text-center">Online Users</div>
          <div className="card-body">
            <OnlineUsers users={onlineUsers} />
          </div>
        </div>
      </div>
    </div>

    {/* Logout Button (Styled like Leave Room) */}
    <div className="text-center mt-4">
      <button className='btn btn-danger' onLogout={onLogout}>
        <Logout />
      </button>
    </div>
  </div>
</div>


  );
};

export default ChatRooms;
