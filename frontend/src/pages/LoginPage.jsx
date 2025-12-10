// src/pages/LoginPage.jsx
import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import "./LoginPage.css";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import sisildiyaLogo from "../assets/sisildiya-logo.png"; // ✅ logo file



const LoginPage = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await api.post("/auth/login", {
        username,
        password,
      });

      const { token, user } = res.data;

      // Save in context + localStorage
      login(user, token);

      // 🔹 Redirect based on role
      if (user.role === "CASHIER") {
        navigate("/invoices/new");
      } else {
        navigate("/dashboard");
      }
    } catch (err) {
      console.error(err);
      const msg =
        err.response?.data?.message || "Invalid username or password.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        {/* ✅ LOGO USING IMAGE */}
        <div className="login-logo">
          <img
            src={sisildiyaLogo}
            alt="Sisildiya Enterprises"
            className="login-logo-img"
          />
          <span className="logo-text">SISILDIYA ENTERPRISES</span>
        </div>

        <h2 className="login-title">
          Small Shop Inventory &amp; Sales Management System
        </h2>

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="input-group">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              type="text"
              placeholder="Enter username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          <div className="input-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && <div className="error-msg">{error}</div>}

          <button className="login-btn" type="submit" disabled={loading}>
            {loading ? "LOGGING IN..." : "LOGIN"}
          </button>

          <Link to="/forgot-password" className="forgot-link">
            Forgot password?
          </Link>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
