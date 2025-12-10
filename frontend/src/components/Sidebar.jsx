// src/components/Sidebar.jsx
import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./Sidebar.css";

// 🔥 import the logo image
import sisildiyaLogo from "../assets/sisildiya-logo.png"; // or .svg

const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const role = user?.role || "";

  const active = (path) =>
    location.pathname === path ? "sidebar-link active" : "sidebar-link";

  return (
    <aside className="sidebar">
      {/* LOGO */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-box">
          <img
            src={sisildiyaLogo}
            alt="Sisildiya Enterprises"
            className="sidebar-logo-img"
          />
        </div>
        <div>
          <div className="sidebar-logo-text-title">SISILDIYA</div>
          <div className="sidebar-logo-text-sub">ENTERPRISES</div>
        </div>
      </div>

      {/* MENU */}
      <nav className="sidebar-menu">
        {/* ===== MAIN SECTION ===== */}
        <div className="sidebar-section-title">MAIN</div>

        {(role === "ADMIN" || role === "MANAGER") && (
          <Link to="/dashboard" className={active("/dashboard")}>
            Dashboard
          </Link>
        )}

        {(role === "ADMIN" || role === "MANAGER") && (
          <Link to="/sales" className={active("/sales")}>
            Sales
          </Link>
        )}

        <Link to="/invoices" className={active("/invoices")}>
          Invoices
        </Link>

        <Link to="/invoices/new" className={active("/invoices/new")}>
          Create Invoice
        </Link>

        {(role === "ADMIN" || role === "MANAGER") && (
          <>
            <div className="sidebar-section-title">ADMINISTRATION</div>

            <Link to="/stock" className={active("/stock")}>
              Stock Management
            </Link>

            <Link
              to="/purchase-orders"
              className={active("/purchase-orders")}
            >
              Purchase Orders
            </Link>

            <Link to="/payments" className={active("/payments")}>
              Payments
            </Link>

            <Link to="/users" className={active("/users")}>
              User Management
            </Link>

            <Link to="/products/new" className={active("/products/new")}>
              Add New Products
            </Link>

            <Link to="/suppliers" className={active("/suppliers")}>
              Supplier Management
            </Link>

            <Link to="/reports" className={active("/reports")}>
              Reports
            </Link>
          </>
        )}
      </nav>

      {/* ===== LOGOUT ===== */}
      <div className="sidebar-footer">
        <button
          className="sidebar-logout-btn"
          onClick={() => {
            logout();
            navigate("/login");
          }}
        >
          Log Out
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
