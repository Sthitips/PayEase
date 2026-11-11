
import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import { useLocation } from "react-router-dom";
import api from "../lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const location = useLocation();

  // Centralized logout
  const logout = () => {
    localStorage.removeItem("payease_token");
    localStorage.removeItem("payease_user");
    setUser(null);
  };

  // Validate session whenever the route changes
  useEffect(() => {
    let active = true;

    const validateSession = async () => {
      const token = localStorage.getItem("payease_token");

      if (!token) {
        if (active) {
          setUser(null);
          setLoading(false);
        }
        return;
      }

      setLoading(true);

      try {
        const response = await api.get("/api/auth/me");

        if (!active) return;

        setUser(response.data);

        localStorage.setItem(
          "payease_user",
          JSON.stringify(response.data)
        );
      } catch (error) {
        if (!active) return;

        localStorage.removeItem("payease_token");
        localStorage.removeItem("payease_user");

        setUser(null);
      } finally {
        if (active) setLoading(false);
      }
    };

    validateSession();

    return () => {
      active = false;
    };
  }, [location.pathname]);

  return (
    <AuthContext.Provider
      value={{ user, setUser, loading, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
