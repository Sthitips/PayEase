import DashboardSidebar from "./DashboardSideBar";
import { useSidebar } from "../context/SidebarContext";
import { Outlet } from "react-router-dom";

export default function ProtectedLayout() {
  const { isSidebarOpen, setIsSidebarOpen } = useSidebar();

  return (
    <>
      <DashboardSidebar
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
      />

      <Outlet />
    </>
  );
}