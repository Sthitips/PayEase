
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";


export default function ProtectedRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FFF4DE]">
        <p className="text-lg font-semibold text-[#182D43]">
          Verifying your session...
        </p>
      </div>
    );
  }

  if (!user) {
    return (
      <Navigate
        to="/auth"
        replace
        state={{ from: location }}
      />
    );
  }

  return <Outlet />;
}
