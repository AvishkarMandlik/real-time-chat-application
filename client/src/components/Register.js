import React, { useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';

const Register = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');

  const handleRegister = async () => {
    if (!username.trim() || !password.trim()) {
      setMessage('Please fill in all fields.');
      return;
    }

    try {
      const response = await axios.post('http://localhost:5000/api/register', {
        username,
        password,
      });
      setMessage(response.data.message);
      setUsername('');
      setPassword('');
    } catch (error) {
      setMessage(error.response?.data?.message || 'Registration failed.');
    }
  };

  return (
<div className="d-flex justify-content-center align-items-center vh-100">
  <div className="container p-4 shadow rounded" style={{ maxWidth: "400px", border: "1px solid #ddd" }}>
    <h2 className="text-center mb-4">Register</h2>
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
    <button className="btn btn-primary w-100 mb-3" onClick={handleRegister}>
      Register
    </button>
    {message && <p className="text-center text-danger">{message}</p>}
    <p className="text-center mt-3">
      Already registered?{" "}
      <Link to="/login" className="text-primary text-decoration-underline">Login</Link>
    </p>
  </div>
</div>

  );
};

export default Register;
