// src/pages/UserManagementPage.jsx
import React, { useEffect, useState } from "react";
import "./DashboardPage.css";
import Sidebar from "../components/Sidebar";
import TopBar from "../components/TopBar";
import { useAuth } from "../context/AuthContext";
import { getUsers, createUser, deleteUser } from "../api/userApi";

const ROLE_OPTIONS = ["ADMIN", "MANAGER", "CASHIER"];

const UserManagementPage = () => {
  const { user } = useAuth(); // { id, username, role }
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [error, setError] = useState("");

  // form state for new user
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState("CASHIER");

  const isAdmin = user?.role === "ADMIN";
  const isManager = user?.role === "MANAGER";

  // helper: can current user manage this target role?
  const canManageRole = (targetRole) => {
    if (isAdmin) return true;
    if (isManager && targetRole === "CASHIER") return true;
    return false;
  };

  // Load users
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoadingUsers(true);
        const res = await getUsers();
        setUsers(res.data);
        setError("");
      } catch (err) {
        console.error(err);
        setError(
          err.response?.data?.message || "Failed to load users from server."
        );
      } finally {
        setLoadingUsers(false);
      }
    };

    fetchData();
  }, []);

  // Handle create user
  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!newUsername || !newPassword) return;

    try {
      const payload = {
        username: newUsername,
        password: newPassword,
        roleName: newRole,
      };

      const res = await createUser(payload);
      // backend returns new user with role property
      setUsers((prev) => [...prev, res.data]);
      setNewUsername("");
      setNewPassword("");
      setNewRole("CASHIER");
      setError("");
    } catch (err) {
      console.error(err);
      setError(
        err.response?.data?.message || "Failed to create user on server."
      );
    }
  };

  // Handle delete user
  const handleDeleteUser = async (id, targetRole) => {
    if (!canManageRole(targetRole)) return;

    if (!window.confirm("Are you sure you want to delete this user?")) return;

    try {
      await deleteUser(id);
      setUsers((prev) => prev.filter((u) => u.id !== id));
    } catch (err) {
      console.error(err);
      setError(
        err.response?.data?.message || "Failed to delete user from server."
      );
    }
  };

  // Role options for the "create user" form
  const availableRoleOptions =
    isAdmin ? ROLE_OPTIONS : ["CASHIER"]; // manager can only create CASHIER

  return (
    <div className="dashboard-layout">
      <Sidebar />

      <main className="dashboard-main">
        <TopBar />

        <header className="dashboard-header">
          <div>
            <div className="dashboard-title">User Management</div>
            <div className="dashboard-subtitle">
              Add, edit and assign roles to system users.
            </div>
          </div>

          <div className="dashboard-user-badge">
            {user ? (
              <>
                Logged in as <strong>{user.username}</strong> ({user.role})
              </>
            ) : (
              "Not logged in"
            )}
          </div>
        </header>

        {/* Error message */}
        {error && (
          <div
            style={{
              marginBottom: "16px",
              padding: "10px 14px",
              borderRadius: "8px",
              background: "#fee2e2",
              color: "#b91c1c",
              fontSize: "14px",
            }}
          >
            {error}
          </div>
        )}

        {/* Users table card */}
        <section className="chart-card">
          <div className="chart-title">Users</div>
          <div className="chart-subtitle">
            List of system users with their roles.
          </div>

          {loadingUsers ? (
            <div className="chart-placeholder">Loading users...</div>
          ) : users.length === 0 ? (
            <div className="chart-placeholder">No users found.</div>
          ) : (
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Username</th>
                    <th>Role</th>
                    <th>Created At</th>
                    <th style={{ textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td>{u.id}</td>
                      <td>{u.username}</td>
                      <td>{u.role}</td>
                      <td>
                        {u.created_at
                          ? new Date(u.created_at).toLocaleString()
                          : "-"}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        {u.id === user.id ? (
                          <span
                            style={{ fontSize: "12px", color: "#9ca3af" }}
                          >
                            Current user
                          </span>
                        ) : canManageRole(u.role) ? (
                          <button
                            className="btn-danger-small"
                            onClick={() => handleDeleteUser(u.id, u.role)}
                          >
                            Delete
                          </button>
                        ) : (
                          <span
                            style={{ fontSize: "12px", color: "#9ca3af" }}
                          >
                            No actions
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Add new user card */}
        <section className="chart-card" style={{ marginTop: "20px" }}>
          <div className="chart-title">Add New User</div>
          <div className="chart-subtitle">
            {isAdmin
              ? "Admins can create Admin, Manager, or Cashier accounts."
              : "Managers can only create Cashier accounts."}
          </div>

          <form
            onSubmit={handleCreateUser}
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: "12px",
              marginTop: "12px",
              alignItems: "center",
            }}
          >
            <input
              type="text"
              placeholder="Username"
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              className="reports-date-input"
              required
            />

            <input
              type="password"
              placeholder="Password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="reports-date-input"
              required
            />

            <select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
              className="reports-date-input"
            >
              {availableRoleOptions.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>

            <button type="submit" className="primary-btn">
              Create User
            </button>
          </form>
        </section>
      </main>
    </div>
  );
};

export default UserManagementPage;
