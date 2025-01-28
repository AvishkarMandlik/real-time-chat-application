import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Logout from './Logout';
const RoomList = () => {
  const [rooms, setRooms] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    // Fetch rooms from the backend
    const fetchRooms = async () => {
      try {
        const response = await axios.get('https://real-time-chat-app-7gqk.onrender.com/rooms');
        setRooms(response.data);
      } catch (error) {
        console.error('Error fetching rooms:', error);
      }
    };

    fetchRooms();
  }, []);

  const createRoom = () => {
    navigate("/rooms/create"); // Redirects to the "Create Room" page
  };
  const joinRoom = (roomName) => {
    navigate(`/rooms/${roomName}`); // Navigate to the chat room
  };

  return (
<div className="d-flex justify-content-center align-items-center vh-100">
  <div className="container p-4 shadow rounded" style={{ maxWidth: "600px", border: "1px solid #ddd" }}>
    <h2 className="text-center mb-4">Available Rooms</h2>
    <div className="d-flex justify-content-between align-items-center mb-3">
      <p className="mb-0">Want to create your own room?</p>
      <button className="btn btn-success" onClick={createRoom}>
        Create Room
      </button>
    </div>
    <ul className="list-group">
      {rooms.length > 0 ? (
        rooms.map((room) => (
          <li
            key={room._id}
            className="list-group-item d-flex justify-content-between align-items-center"
          >
            <span>{room.name}</span>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => joinRoom(room.name)}
            >
              Join
            </button>
          </li>
        ))
      ) : (
        <li className="list-group-item text-center text-muted">
          No rooms available. Create one!
        </li>
      )}
    </ul>
  </div>
</div>

  );
};

export default RoomList;
