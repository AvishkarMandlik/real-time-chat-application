import React, { useEffect, useState, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import Chat from './Chat';
import OnlineUsers from './OnlineUsers';
import Logout from "./Logout";
import VideoChat from './VideoChat'; 

// Create socket instance as a ref to maintain consistency
const socket = io('https://real-time-chat-app-7gqk.onrender.com');

const ChatRooms = ({ onLogout }) => {
  const { roomId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [isInCall, setIsInCall] = useState(false);
  const [videoCallUsers, setVideoCallUsers] = useState([]);

  const username = location.state?.username || localStorage.getItem('username') || 'Anonymous';

  useEffect(() => {
    if (!roomId) return;
    
    socket.emit('joinRoom', { username, room: roomId });

    socket.on('chatHistory', (history) => setMessages(history));
    socket.on('chatMessage', (message) => setMessages((prev) => [...prev, message]));
    socket.on('onlineUsers', (users) => {
      setOnlineUsers(users);
      // Update video call users when online users change
      setVideoCallUsers(users);
    });

    // Listen for video call events
    socket.on('videoCallStarted', () => {
      setIsInCall(true);
    });

    return () => {
      socket.emit('leaveRoom', { username, room: roomId });
      socket.off('chatHistory');
      socket.off('chatMessage');
      socket.off('onlineUsers');
      socket.off('videoCallStarted');
    };
  }, [roomId]);

  const leaveRoom = () => {
    socket.emit('leaveRoom', { username, room: roomId });
    navigate('/rooms');
  };

  const startVideoCall = () => {
    setIsInCall(true);
    // Notify other users that a video call has started
    socket.emit('startVideoCall', { room: roomId });
  };

  const endVideoCall = () => {
    setIsInCall(false);
    // Notify other users that the video call has ended
    socket.emit('endVideoCall', { room: roomId });
  };

  return (
    <div className="d-flex flex-column" style={{ 
      backgroundColor: '#1a1a1a', 
      minHeight: '100vh',
      overflow: 'hidden'
    }}>
      {isInCall ? (
       <VideoChat 
       room={roomId}
       username={username}
       onEndCall={endVideoCall}
       socket={socket}
       onlineUsers={onlineUsers}
     />
      ) : (
        <div className="container-fluid d-flex flex-column flex-grow-1 py-4" style={{
          height: '100vh',
          overflow: 'auto'
        }}>
          <div className="container flex-grow-1 d-flex flex-column p-0" style={{
            maxWidth: '1200px',
            backgroundColor: '#262626',
            borderRadius: '8px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
            overflow: 'hidden'
          }}>
            {/* Header */}
            <div className="d-flex justify-content-between align-items-center p-3" style={{ 
              backgroundColor: '#ff4d4d',
              borderBottom: '1px solid #333'
            }}>
              <h2 className="mb-0 text-white" style={{ fontSize: '1.5rem' }}>
                <i className="fas fa-comments me-2"></i>
                {roomId}
              </h2>
              <div className="d-flex">
                <button 
                  className="btn btn-sm me-2" 
                  onClick={leaveRoom}
                  style={{ 
                    backgroundColor: '#333', 
                    color: '#fff', 
                    border: '1px solid #ff4d4d',
                    borderRadius: '20px',
                    padding: '6px 16px'
                  }}
                >
                  <i className="fas fa-sign-out-alt me-1"></i>
                  Leave
                </button>
                <Logout />
              </div>
            </div>

            {/* Main Content */}
            <div className="flex-grow-1 d-flex flex-column p-3" style={{
              overflow: 'hidden'
            }}>
              {/* Online Users Card */}
              <div className="mb-4" style={{ flex: '0 0 auto' }}>
                <div className="card border-0" style={{ 
                  backgroundColor: '#333',
                  boxShadow: '0 2px 10px rgba(0, 0, 0, 0.2)'
                }}>
                  <div className="card-header d-flex justify-content-between align-items-center py-2" style={{ 
                    backgroundColor: '#ff4d4d',
                    color: '#fff'
                  }}>
                    <span>
                      <i className="fas fa-users me-2"></i>
                      Online Users ({onlineUsers.length})
                    </span>
                  </div>
                  <div className="card-body p-2" style={{ 
                    maxHeight: '150px',
                    overflowY: 'auto'
                  }}>
                    <OnlineUsers users={onlineUsers} />
                  </div>
                </div>
              </div>

              {/* Chat and Video Area */}
              <div className="flex-grow-1 d-flex flex-column flex-md-row" style={{
                gap: '16px',
                overflow: 'hidden'
              }}>
                {/* Chat Container */}
                <div className="flex-grow-1 d-flex flex-column mb-3 mb-md-0" style={{
                  backgroundColor: '#333',
                  borderRadius: '6px',
                  overflow: 'hidden',
                  minHeight: '300px'
                }}>
                  <div className="p-3" style={{
                    flex: '1',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden'
                  }}>
                    <Chat username={username} messages={messages} socket={socket} room={roomId} />
                  </div>
                </div>

                {/* Video Start Section */}
                <div className="d-flex flex-column" style={{
                  width: '100%',
                  maxWidth: '400px',
                  flex: '0 0 auto'
                }}>
                  <div className="d-flex flex-column justify-content-center align-items-center p-4" style={{
                    backgroundColor: '#333',
                    borderRadius: '6px',
                    height: '100%'
                  }}>
                    <div className="text-center mb-4">
                      <i className="fas fa-video fa-3x mb-3" style={{ color: '#ff4d4d' }}></i>
                      <h4 style={{ color: '#fff' }}>Ready to start the meeting?</h4>
                      <p className="text-muted">Click below to start video chat</p>
                    </div>
                    <button 
                      className="btn btn-lg w-100" 
                      onClick={startVideoCall}
                      style={{ 
                        backgroundColor: '#ff4d4d', 
                        color: '#fff',
                        border: 'none',
                        borderRadius: '30px',
                        padding: '12px 24px',
                        fontWeight: '500',
                        boxShadow: '0 2px 10px rgba(255, 77, 77, 0.3)',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => e.target.style.transform = 'translateY(-2px)'}
                      onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
                    >
                      <i className="fas fa-video me-2"></i>
                      Start Video Meeting
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatRooms;