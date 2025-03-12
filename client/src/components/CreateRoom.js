import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const CreateRoom = () => {
  const [roomName, setRoomName] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const createRoom = async () => {
    if (!roomName.trim()) {
      setError('Room name cannot be empty');
      return;
    }

    try {
      const response = await axios.post('http://localhost:5000/rooms', { name: roomName });
      alert('Room created successfully!');
      setRoomName('');
      navigate(`/rooms/${response.data.room.name}`);
    } catch (error) {
      console.error('Error creating room:', error);
      setError(error.response?.data?.message || 'Failed to create room');
    }
  };

  return (
    <div className="d-flex vh-100 justify-content-center align-items-center" style={{ backgroundColor: '#1a1a1a' }}>
      <div className="container p-4 rounded" style={{ maxWidth: '400px', backgroundColor: '#262626' }}>
        <h2 className="text-center mb-4" style={{ color: '#ff4d4d' }}>Create a New Chat Room</h2>
        <div className="mb-3">
          <label htmlFor="roomName" className="form-label" style={{ color: '#fff' }}>
            Room Name
          </label>
          <input
            type="text"
            className="form-control"
            id="roomName"
            value={roomName}
            onChange={(e) => {
              setRoomName(e.target.value);
              setError('');
            }}
            placeholder="Enter room name"
            style={{ backgroundColor: '#fff', color: '#000', border: '1px solid #ddd' }}
          />
        </div>
        <button
          className="btn w-100 mb-3"
          onClick={createRoom}
          style={{ backgroundColor: '#ff4d4d', color: '#fff', border: 'none' }}
        >
          Create Room
        </button>
        {error && <p className="text-center" style={{ color: '#ff4d4d' }}>{error}</p>}
      </div>
    </div>
  );
};

export default CreateRoom;