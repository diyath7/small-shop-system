import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:4000/api", // ⬅️ change 4000 to your backend port
});

// Attach token from localStorage to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("authToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
