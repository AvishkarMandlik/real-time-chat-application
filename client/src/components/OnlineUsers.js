import React from 'react';

const OnlineUsers = ({ users }) => {
  return (
    <div className="border p-3">
      <h5>Online Users</h5>
      <ul className="list-group">
        {users.map((user, index) => (
          <li key={index} className="list-group-item">{user}</li>
        ))}
      </ul>
    </div>
  );
};

export default OnlineUsers;
