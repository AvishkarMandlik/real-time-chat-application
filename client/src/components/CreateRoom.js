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
      setRoomName(''); // Clear the input
      navigate(`/rooms/${response.data.room.name}`); // Redirect to the created room
    } catch (error) {
      console.error('Error creating room:', error);
      setError(error.response?.data?.message || 'Failed to create room');
    }
  };

  return (
<div className="d-flex justify-content-center align-items-center vh-100">
  <div className="container p-4 shadow rounded" style={{ maxWidth: "400px", border: "1px solid #ddd" }}>
    <h2 className="text-center mb-4">Create a New Chat Room</h2>
    <div className="input-group mb-3">
      <input
        type="text"
        className="form-control"
        placeholder="Enter room name"
        value={roomName}
        onChange={(e) => {
          setRoomName(e.target.value);
          setError(''); // Clear error on input change
        }}
      />
      <button className="btn btn-success" onClick={createRoom}>
        Create Room
      </button>
    </div>
    {error && <p className="text-danger text-center">{error}</p>}
  </div>
</div>

  );
};

export default CreateRoom;
