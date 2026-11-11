
import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 15000,
});

// Attach JWT to every request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("payease_token");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Handle expired or invalid authentication
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const url = error.config?.url || "";

    const isAuthRequest =
      url.includes("/api/auth/login") ||
      url.includes("/api/auth/register");

    if (
      status === 401 &&
      !isAuthRequest &&
      localStorage.getItem("payease_token")
    ) {
      localStorage.removeItem("payease_token");
      localStorage.removeItem("payease_user");

      window.location.assign("/auth");
    }

    return Promise.reject(error);
  }
);

export default api;
