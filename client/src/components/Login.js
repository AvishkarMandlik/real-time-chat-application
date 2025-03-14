import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import illustration from '../assets/video-call-1-72.png';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      setMessage('Please fill in all fields.');
      return;
    }

    try {
      // const response = await axios.post('https://real-time-chat-app-7gqk.onrender.com/api/login', {
        const response = await axios.post('http://localhost:5000/api/auth/login', {
        username,
        password,
      });
      setMessage('Login successful!');

      localStorage.setItem('username', username);
      setTimeout(() => {
        console.log('Username before navigating:', username);
        navigate(`/rooms/`, { state: { username } });
      }, 1000);
    } catch (error) {
      setMessage(error.response?.data?.message || 'Login failed.');
    }
  };

  return (
    <div className="d-flex vh-100" style={{ backgroundColor: '#1a1a1a' }}>
      {/* Left Side: Illustration */}
      <div
        className="w-50 d-flex justify-content-center align-items-center"
        style={{ backgroundColor: '#ff4d4d' }}
      >
        <img
          src={illustration}
          alt="Illustration"
          style={{ width: '80%', maxWidth: '400px' }}
        />
      </div>

      {/* Right Side: Login Form */}
      <div className="w-50 d-flex justify-content-center align-items-center">
        <div className="container p-4 rounded" style={{ maxWidth: '400px', backgroundColor: '#262626' }}>
          <h2 className="text-center mb-4" style={{ color: '#ff4d4d' }}>
            Login
          </h2>
          <div className="mb-3">
            <label htmlFor="username" className="form-label" style={{ color: '#fff' }}>
              Username
            </label>
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
            <label htmlFor="password" className="form-label" style={{ color: '#fff' }}>
              Password
            </label>
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
            onClick={handleLogin}
            style={{ backgroundColor: '#ff4d4d', color: '#fff', border: 'none' }}
          >
            Login
          </button>
          {message && (
            <p className="text-center" style={{ color: '#ff4d4d' }}>
              {message}
            </p>
          )}
          <p className="text-center mt-3" style={{ color: '#fff' }}>
            Don’t have an account?{' '}
            <Link to="/" className="text-decoration-underline" style={{ color: '#ff4d4d' }}>
              Register
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;