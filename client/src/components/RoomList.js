import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const RoomList = () => {
  const [rooms, setRooms] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchRooms = async () => {
      try {
        // const response = await axios.get('https://real-time-chat-app-7gqk.onrender.com/rooms');
        const response = await axios.get('http://localhost:5000/rooms');
        setRooms(response.data.reverse()); // Reverse to show new rooms at the top
      } catch (error) {
        console.error('Error fetching rooms:', error);
      }
    };
    fetchRooms();
  }, []);

  const createRoom = () => {
    navigate("/rooms/create");
  };

  const joinRoom = (roomName) => {
    navigate(`/rooms/${roomName}`);
  };

  return (
    <div className="d-flex vh-100 justify-content-center align-items-center" style={{ backgroundColor: '#1a1a1a' }}>
      <div className="container p-4 rounded" style={{ maxWidth: '600px', backgroundColor: '#262626' }}>
        <h2 className="text-center mb-4" style={{ color: '#ff4d4d' }}>Available Rooms</h2>
        <div className="d-flex justify-content-between align-items-center mb-3">
          <p className="mb-0" style={{ color: '#fff' }}>Want to create your own room?</p>
          <button className="btn" onClick={createRoom} style={{ backgroundColor: '#ff4d4d', color: '#fff' }}>
            Create Room
          </button>
        </div>
        <div style={{ maxHeight: '300px', overflowY: 'auto' }}> {/* Scrollable list container */}
          <ul className="list-group">
            {rooms.length > 0 ? (
              rooms.slice().map((room) => ( /* Show only 8 rooms at a time */
                <li
                  key={room._id}
                  className="list-group-item d-flex justify-content-between align-items-center"
                  style={{ backgroundColor: '#333', color: '#fff', border: '1px solid #444' }}
                >
                  <span>{room.name}</span>
                  <button
                    className="btn btn-sm"
                    onClick={() => joinRoom(room.name)}
                    style={{ backgroundColor: '#ff4d4d', color: '#fff' }}
                  >
                    Join
                  </button>
                </li>
              ))
            ) : (
              <li className="list-group-item text-center text-muted" style={{ backgroundColor: '#333', color: '#aaa' }}>
                No rooms available. Create one!
              </li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default RoomList;
