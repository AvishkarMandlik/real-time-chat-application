import React from 'react';

const OnlineUsers = ({ users, raisedHands = [] }) => {
  if (!Array.isArray(users)) {
    console.error("Expected an array for users, but received:", users);
    users = [];
  }

  return (
    <div>
      <h5 style={{ color: '#ff4d4d' }}>Online Users ({users.length})</h5>
      {users.length === 0 ? (
        <p style={{ color: '#ccc' }}>No users online</p>
      ) : (
        <ul className="list-group">
          {users.map((user, index) => (
            <li 
              key={user.userId || index}
              className="list-group-item d-flex align-items-center justify-content-between"
              style={{ 
                backgroundColor: '#262626', 
                color: '#fff',
                border: '1px solid #444',
                marginBottom: '5px',
                borderRadius: '8px',
              }}
            >
              <div className="d-flex align-items-center">
                <span 
                  className="online-indicator me-2" 
                  style={{ 
                    display: 'inline-block',
                    width: '12px',
                    height: '12px', 
                    borderRadius: '50%',
                    backgroundColor: 'rgb(47 218 28)',
                    marginRight: '10px',
                  }}
                ></span>
                {user.username || user}
              </div>
              {raisedHands.some(u => u.userId === user.userId) && (
                <i className="fas fa-hand-paper text-warning"></i>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default OnlineUsers;