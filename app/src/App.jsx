import { useState } from "react";

import "./App.css";
import LandingPage from "../pages/LandingPage";
import { Route, Routes } from "react-router-dom";
import AuthPage from "../pages/auth";
import DashboardPage from "../pages/dashboard";
import Profile from "../pages/profilepage";
import Room from "../pages/room";
import ProtectedRoute from "../pages/protectedroute.jsx";
import ProtectedRoom from "../pages/protectedroom.jsx";

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/auth" element={<AuthPage />} />
      <Route
        path="/dashboard"
        element={<ProtectedRoute children={<DashboardPage />} />}
      />
      <Route path="/profile" element={<Profile />} />
      <Route path="/room" element={<ProtectedRoom children={<Room />} />} />
    </Routes>
  );
}

export default App;
