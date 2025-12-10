// src/components/TopBar.jsx
import React from "react";
import { useAuth } from "../context/AuthContext";

const TopBar = () => {
  const { user, logout } = useAuth();

  return (
    <header className="topbar">
      <div className="topbar-user-info">
        {user && (
          <span className="topbar-username">
            {user.username} ({user.role})
          </span>
        )}
        <button
          type="button"
          className="topbar-logout-btn"
          onClick={logout}
        >
          Logout
        </button>
      </div>
    </header>
  );
};

export default TopBar;
