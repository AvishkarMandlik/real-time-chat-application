import React from 'react';

const OnlineUsers = ({ users }) => {
  if (!Array.isArray(users)) {
    console.error("Expected an array for users, but received:", users);
    users = [];
  }
  const uniqueUsers = [...new Set(users)];

  return (
<div>
  <h5 style={{ color: '#ff4d4d' }}>Online Users</h5>
  {uniqueUsers.length === 0 ? (
    <p style={{ color: '#ccc' }}>No users online</p>
  ) : (
    <ul className="list-group">
      {uniqueUsers.map((user, index) => (
        <li 
          key={index} // Use a unique ID if available
          className="list-group-item d-flex align-items-center"
          style={{ 
            backgroundColor: '#262626', 
            color: '#fff',
            border: '1px solid #444',
            marginBottom: '5px',
            padding: '10px', // Adjust padding to fit the design
            borderRadius: '8px', // Rounded corners for a modern look
          }}
        >
          <span 
            className="online-indicator me-2" 
            style={{ 
              display: 'inline-block',
              width: '12px', // Increased size for visibility
              height: '12px', 
              borderRadius: '50%',
              backgroundColor: 'rgb(47 218 28)', // Red for online status
              marginRight: '10px', // Space between the indicator and the username
            }}
          ></span>
          {user}
        </li>
      ))}
    </ul>
  )}
</div>

  );
};

export default OnlineUsers;