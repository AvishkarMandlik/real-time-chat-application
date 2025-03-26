import React, { useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import illustration from '../assets/chatting-33.png';

const Register = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [assignedUsername, setAssignedUsername] = useState('');

  const handleRegister = async () => {
    if (!username.trim() || !email.trim() || !password.trim()) {
      setMessage('Please fill in all fields.');
      return;
    }

    try {
      const response = await axios.post('https://real-time-chat-app-7gqk.onrender.com/api/register', {
        username,
        email,
        password,
      });

      setMessage(response.data.message);
      setAssignedUsername(response.data.username || '');
      setUsername('');
      setEmail('');
      setPassword('');
    } catch (error) {
      setMessage(error.response?.data?.message || 'Registration failed.');
    }
  };

  return (
    <div className="d-flex vh-100" style={{ backgroundColor: '#1a1a1a' }}>
      <div className="w-50 d-flex justify-content-center align-items-center" style={{ backgroundColor: '#ff4d4d' }}>
        <img src={illustration} alt="Illustration" style={{ width: '80%', maxWidth: '400px' }} />
      </div>

      <div className="w-50 d-flex justify-content-center align-items-center">
        <div className="container p-4 rounded" style={{ maxWidth: '400px', backgroundColor: '#262626' }}>
          <h2 className="text-center mb-4" style={{ color: '#ff4d4d' }}>Register</h2>
          
          <div className="mb-3">
            <label htmlFor="username" className="form-label" style={{ color: '#fff' }}>Username</label>
            <input
              type="text"
              className="form-control"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              style={{ backgroundColor: '#fff', color: '#000', border: '1px solid #ddd' }}
            />
          </div>

          <div className="mb-3">
            <label htmlFor="email" className="form-label" style={{ color: '#fff' }}>Email</label>
            <input
              type="email"
              className="form-control"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              style={{ backgroundColor: '#fff', color: '#000', border: '1px solid #ddd' }}
            />
          </div>

          <div className="mb-3">
            <label htmlFor="password" className="form-label" style={{ color: '#fff' }}>Password</label>
            <input
              type="password"
              className="form-control"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              style={{ backgroundColor: '#fff', color: '#000', border: '1px solid #ddd' }}
            />
          </div>

          <button
            className="btn w-100 mb-3"
            onClick={handleRegister}
            style={{ backgroundColor: '#ff4d4d', color: '#fff', border: 'none' }}
          >
            Register
          </button>

          {message && <p className="text-center" style={{ color: '#ff4d4d' }}>{message}</p>}
          {assignedUsername && (
            <p className="text-center" style={{ color: '#ff4d4d' }}>
              Your assigned username: <strong>{assignedUsername}</strong>
            </p>
          )}

          <p className="text-center mt-3" style={{ color: '#fff' }}>
            Already registered? <Link to="/login" className="text-decoration-underline" style={{ color: '#ff4d4d' }}>Login</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
