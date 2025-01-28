import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      navigate(`/rooms/`, { state: { username } });
      setMessage('Please fill in all fields.');
      return;
    }

    try {
      const response = await axios.post('https://real-time-chat-app-7gqk.onrender.com/api/login', { username, password });
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
<div className="d-flex justify-content-center align-items-center vh-100">
  <div className="container p-4 shadow rounded" style={{ maxWidth: "400px", border: "1px solid #ddd" }}>
    <h2 className="text-center mb-4">Login</h2>
    <div className="mb-3">
      <label htmlFor="username" className="form-label">Username</label>
      <input
        type="text"
        className="form-control"
        id="username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        placeholder="Enter your username"
      />
    </div>
    <div className="mb-3">
      <label htmlFor="password" className="form-label">Password</label>
      <input
        type="password"
        className="form-control"
        id="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Enter your password"
      />
    </div>
    <button className="btn btn-primary w-100 mb-3" onClick={handleLogin}>
      Login
    </button>
    {message && <p className="text-center text-danger">{message}</p>}
    <p className="text-center mt-3">
      Don’t have an account?{" "}
      <Link to="/" className="text-primary text-decoration-underline">Register</Link>
    </p>
  </div>
</div>

  );
};

export default Login;

