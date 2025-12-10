import React, { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);   // { id, username, role }
  const [token, setToken] = useState(null); // JWT
  const [loading, setLoading] = useState(true);

  // Load from localStorage on refresh
  useEffect(() => {
    // Try both keys, just in case
    const storedToken =
      localStorage.getItem("authToken") || localStorage.getItem("token");
    const storedUser = localStorage.getItem("authUser");

    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const login = (userData, jwtToken) => {
    setUser(userData);
    setToken(jwtToken);

    // Save under both keys
    localStorage.setItem("authToken", jwtToken);
    localStorage.setItem("token", jwtToken);        // 🔹 NEW
    localStorage.setItem("authUser", JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    setToken(null);

    // Remove both keys
    localStorage.removeItem("authToken");
    localStorage.removeItem("token");              // 🔹 NEW
    localStorage.removeItem("authUser");
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
