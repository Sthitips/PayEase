import React from 'react'
import Home from './pages/Home'
import Auth from './pages/Auth'
import {BrowserRouter, Routes, Route} from "react-router-dom";
import Dashboard from './pages/Dashboard';
import GroupDetails from './pages/GroupDetails';
import QRScanner from './pages/QRScanner';
import Settlements from './pages/Settlements';
import ProfileSettings from './pages/ProfileSettings';

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/group/:groupId" element={<GroupDetails />} />
        <Route path="/group/:groupId/scan" element={<QRScanner />} />
        <Route path="/scan" element={<QRScanner />} />
        <Route path="/group/:groupId/settle" element={<Settlements />} />
        <Route path="/profile" element={<ProfileSettings />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App