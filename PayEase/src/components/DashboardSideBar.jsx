import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  Menu,
  X,
  LayoutDashboard,
  Users,
  Receipt,
  UserRound,
  LogOut,
  ChevronDown,
} from "lucide-react";

export default function DashboardSidebar({ isOpen, setIsOpen }) {
  const [accountOpen, setAccountOpen] = useState(false);
  const navigate = useNavigate();
  const { logout } = useAuth();
  const location = useLocation();

  const closeSidebar = () => setIsOpen(false);
  const handleLogout = () => {
    closeSidebar();
    logout();
    navigate("/", { replace: true });
  };

  return (
    <>
      {/* Dark overlay */}
      <div
        onClick={closeSidebar}
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity duration-300 ${isOpen
          ? "visible opacity-100"
          : "invisible opacity-0"
          }`}
      />

      {/* Sidebar drawer */}
      <aside
        className={`fixed left-0 top-0 z-50 flex h-screen w-72 flex-col bg-white shadow-xl transition-transform duration-300 ease-in-out ${isOpen ? "translate-x-0" : "-translate-x-full"
          }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b p-5">
          <h2 className="text-xl font-bold">PayEase</h2>

          <button
            onClick={closeSidebar}
            className="rounded-lg p-2 hover:bg-gray-100"
            aria-label="Close navigation menu"
          >
            <X size={22} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-2 p-4">
          <Link
            to="/dashboard"
            onClick={closeSidebar}
            className="flex items-center gap-3 rounded-lg p-3 hover:bg-orange-100"
          >
            <LayoutDashboard size={20} />
            Dashboard
          </Link>

          {/* Account accordion */}
          <Link
            to="/profile"
            onClick={closeSidebar}
            className="flex items-center gap-3 rounded-lg p-3 hover:bg-orange-100"
          >
            <UserRound size={18} />
            Profile
          </Link>
        </nav>

        {/* Logout */}
        <div className="border-t p-4">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg p-3 text-red-600 hover:bg-red-50"
          >
            <LogOut size={20} />
            Log out
          </button>
        </div>
      </aside>
    </>
  );
}