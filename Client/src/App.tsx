import React from "react";
import { Outlet, useLocation } from "react-router-dom";
import AppSidebar from "./components/AppSidebar";
import { AuthProvider } from "./contexts/AuthContext";

const App = () => {
  const location = useLocation();
  const isOfficePage = location.pathname.startsWith("/offices/");

  return (
    <AuthProvider>
      <div className="min-h-screen bg-theme-primary text-theme-primary">
        <AppSidebar compact={isOfficePage} />
        <main
          className={`relative min-h-screen transition-[padding] duration-300 ${
            isOfficePage ? "lg:pl-20" : "lg:pl-[268px]"
          }`}
        >
          <Outlet />
        </main>
      </div>
    </AuthProvider>
  );
};

export default App;
