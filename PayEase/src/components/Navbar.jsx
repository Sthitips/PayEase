
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { User2Icon } from "lucide-react";
import { useSidebar } from "../context/SidebarContext";
import Button from "./Button";
import travelLogo from "../assets/travel.png";

function getStoredUser() {
  try {
    const savedUser = localStorage.getItem("payease_user");
    return savedUser ? JSON.parse(savedUser) : null;
  } catch {
    return null;
  }
}

export default function Navbar({ user: userProp }) {
  const navigate = useNavigate();
  const [storedUser, setStoredUser] = useState(getStoredUser);
  const { toggleSidebar } = useSidebar();
  useEffect(() => {
    // Keep the Navbar in sync if the login session changes in another tab.
    const syncUser = () => setStoredUser(getStoredUser());

    window.addEventListener("storage", syncUser);
    return () => window.removeEventListener("storage", syncUser);
  }, []);

  const token = localStorage.getItem("payease_token");
  const activeUser = userProp || storedUser;
  const isLoggedIn = Boolean(token && activeUser);

  const handleLogoClick = () => {
  if (isLoggedIn) {
    toggleSidebar();
  } else {
    navigate("/");
  }
};

  const handleGetStartedClick = () => {
    navigate(isLoggedIn ? "/profile" : "/auth");
  };

  return (
    <header className="bg-[#FFFFFF]/50 backdrop-blur-xl relative z-20 border-b border-[#182D43]/40">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 md:px-10">

        {/* Logo */}
        <div
          onClick={handleLogoClick}
          className="flex items-center gap-1 text-2xl font-extrabold tracking-tight text-white sm:text-3xl md:text-4xl hover:cursor-pointer select-none"
        >
          <img
            src={travelLogo}
            alt="PayEase Logo"
            className="h-10 w-10 sm:h-10 inline-block mx-1"
          />
          <span className="text-[#182D43]">Pay</span>
          <span className="text-[#FF684F]">Ease</span>
        </div>

        {/* Get Started / Profile */}
        <div onClick={handleGetStartedClick} className="hover:cursor-pointer">
          {!isLoggedIn ? (
            <Button className="px-4 py-2 text-sm">
              Get started
            </Button>
          ) : (
            <div className="flex items-center">
              <User2Icon
                size={40}
                className="inline-block mr-2 bg-white rounded-full p-1 border-2 border-black"
              />
              <span className="font-semibold text-lg text-[#182D43]">
                {activeUser.name || "My Profile"}
              </span>
            </div>
          )}
        </div>

      </nav>
    </header>
  );
}
