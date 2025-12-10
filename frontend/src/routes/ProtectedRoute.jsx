import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) return null; // later you can show a spinner here

  if (!user) {
    // Not logged in at all
    return <Navigate to="/" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Logged in but not allowed to view this page
    return <Navigate to="/" replace />;
  }

  return children;
};

export default ProtectedRoute;
