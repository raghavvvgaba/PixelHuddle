import React from "react";
import { Outlet, useLocation } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";

const App = () => {
  const location = useLocation();
  const isRoomPage = location.pathname.startsWith("/room");

  return (
    <AuthProvider>
      <div className={isRoomPage ? "" : "min-h-screen bg-theme-primary text-theme-primary"}>
        <main className={isRoomPage ? "" : "relative min-h-screen bg-theme-primary text-theme-primary"}>
          <Outlet />
        </main>
      </div>
    </AuthProvider>
  );
};

export default App;
