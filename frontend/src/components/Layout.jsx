<<<<<<< HEAD
=======
import { useState } from "react";
>>>>>>> e0242ca (updating onbording page)
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";

const Layout = ({ children, showSidebar = false }) => {
<<<<<<< HEAD
  return (
    <div className="h-screen flex overflow-hidden">
      {showSidebar && <Sidebar />}

      <div className="flex-1 flex flex-col min-w-0">
        <Navbar />

        <main className="flex-1 min-h-0 overflow-hidden">{children}</main>
=======
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  return (
    <div className="h-screen flex overflow-hidden relative">
      {/* SIDEBAR - DESKTOP (STAYS AS IS) & MOBILE (HIDDEN BY DEFAULT) */}
      {showSidebar && (
        <>
          {/* Desktop Sidebar */}
          <div className="hidden lg:block">
            <Sidebar />
          </div>

          {/* Mobile Sidebar Overlay */}
          {isMobileSidebarOpen && (
            <div 
              className="fixed inset-0 bg-black/50 z-40 lg:hidden"
              onClick={() => setIsMobileSidebarOpen(false)}
            />
          )}

          {/* Mobile Sidebar Drawer */}
          <div className={`fixed inset-y-0 left-0 z-50 transform ${isMobileSidebarOpen ? "translate-x-0" : "-translate-x-full"} transition-transform duration-300 ease-in-out lg:hidden w-72 bg-base-200`}>
            <Sidebar onClose={() => setIsMobileSidebarOpen(false)} />
          </div>
        </>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <Navbar onMenuClick={() => setIsMobileSidebarOpen(true)} showMenuButton={showSidebar} />

        <main className="flex-1 min-h-0 overflow-hidden relative">{children}</main>
>>>>>>> e0242ca (updating onbording page)
      </div>
    </div>
  );
};
export default Layout;
