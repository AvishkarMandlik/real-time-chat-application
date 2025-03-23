import React, { useEffect, useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import Chat from './Chat';
import OnlineUsers from './OnlineUsers';
import Logout from "./Logout";
import VideoChat from './VideoChat'; 

const socket = io('https://real-time-chat-app-7gqk.onrender.com');
// const socket = io('http://localhost:5000');

const ChatRooms = ({ onLogout }) => {
  const { roomId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isInCall, setIsInCall] = useState(false);
  const [isVideoMinimized, setIsVideoMinimized] = useState(false);

  const username = location.state?.username || localStorage.getItem('username') || 'Anonymous';

  useEffect(() => {
    if (!roomId) return;
    
    socket.emit('joinRoom', { username, room: roomId });

    socket.on('chatHistory', (history) => setMessages(history));
    socket.on('chatMessage', (message) => setMessages((prev) => [...prev, message]));
    socket.on('onlineUsers', (users) => setOnlineUsers(users));

    return () => {
      socket.emit('leaveRoom', { username, room: roomId });
      socket.off();
    };
  }, [roomId]);

  const leaveRoom = () => {
    socket.emit('leaveRoom', { username, room: roomId });
    navigate('/rooms');
  };

  const handleMicToggle = (value) => {
    setIsMicOn(value);
  };

  const handleVideoToggle = (value) => {
    setIsVideoOn(value);
  };

  const handleMinimizeVideo = () => {
    setIsVideoMinimized(!isVideoMinimized);
  };

  return (
    <div className="container-fluid vh-200 d-flex pt-3 justify-content-center align-items-center" style={{ backgroundColor: '#1a1a1a' }}>
      <div className="container p-4 shadow-lg rounded" style={{ maxWidth: "1000px", backgroundColor: '#262626' }}>
        
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h2 className="text-center mb-0" style={{ color: '#ff4d4d' }}>Chat Room: {roomId}</h2>
          <button 
            className="btn" 
            onClick={leaveRoom}
            style={{ backgroundColor: '#333', color: '#fff', border: '1px solid #ff4d4d' }}
          >
            Leave Room
          </button>
            <Logout />
        </div>

        <div className="row justify-content-center my-3">
          <div className="col-md-9">
            <div className="card" style={{ backgroundColor: '#333', borderColor: '#ff4d4d' }}>
              <div className="card-header text-center" style={{ backgroundColor: '#ff4d4d', color: '#fff' }}>
                Online Users
              </div>
              <div className="card-body text-white">
                <OnlineUsers users={onlineUsers} />
              </div>
            </div>
          </div>
        </div>


        <div className="row">
          <div className="col-md-6 mb-3">
            <div 
              className="chat-box border rounded p-3 mb-3" 
              style={{  
                backgroundColor: '#333', 
                borderColor: '#ff4d4d !important'
              }}
            >
              <Chat username={username} messages={messages} socket={socket} room={roomId} />
            </div>
          </div>

          <div className="col-md-6">
            {isInCall ? (
              <VideoChat 
                room={roomId}
                username={username}
                isMicOn={isMicOn}
                isVideoOn={isVideoOn}
                onEndCall={() => setIsInCall(false)}
                onMicToggle={handleMicToggle}
                onVideoToggle={handleVideoToggle}
                onMinimize={handleMinimizeVideo}
                isMinimized={isVideoMinimized}
              />
            ) : (
              <button 
                className="btn w-100" 
                onClick={() => setIsInCall(true)}
                style={{ backgroundColor: '#ff4d4d', color: '#fff' }}
              >
                <i className="fas fa-video me-2"></i>
                Start Video Meeting
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatRooms;