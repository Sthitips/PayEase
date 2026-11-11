
import { BrowserRouter, Routes, Route } from "react-router-dom";

import Home from "./pages/Home";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import GroupDetails from "./pages/GroupDetails";
import QRScanner from "./pages/QRScanner";
import Settlements from "./pages/Settlements";
import ProfileSettings from "./pages/ProfileSettings";

import PublicRoute from "./components/PublicRoute";
import ProtectedRoute from "./components/ProtectedRoute";
import ProtectedLayout from "./components/ProtectedLayout";

import { AuthProvider } from "./context/AuthContext";
import { SidebarProvider } from "./context/SidebarContext";

const App = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SidebarProvider>
          <Routes>
            {/* Public routes */}
            <Route
              path="/"
              element={
                <PublicRoute>
                  <Home />
                </PublicRoute>
              }
            />

            <Route
              path="/auth"
              element={
                <PublicRoute>
                  <Auth />
                </PublicRoute>
              }
            />

            {/* Protected routes */}
            <Route element={<ProtectedRoute />}>
              <Route element={<ProtectedLayout />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/group/:groupId" element={<GroupDetails />} />
                <Route path="/group/:groupId/scan" element={<QRScanner />} />
                <Route path="/scan" element={<QRScanner />} />
                <Route path="/group/:groupId/settle" element={<Settlements />} />
                <Route path="/profile" element={<ProfileSettings />} />
              </Route>
            </Route>
          </Routes>
        </SidebarProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
