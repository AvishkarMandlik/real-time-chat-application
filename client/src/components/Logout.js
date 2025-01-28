import React from "react";
import { useNavigate } from "react-router-dom";

const Logout = ({ onLogout }) => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("username");
    navigate("/login"); 
  };

  return (
<div className="text-end">
  <button className="btn btn-danger" onClick={handleLogout}>
    Logout
  </button>
</div>
  );
};

export default Logout;
