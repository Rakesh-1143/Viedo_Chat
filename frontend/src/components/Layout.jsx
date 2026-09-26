import { useState } from "react";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";

const Layout = ({ children, showSidebar = false }) => {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  return (
    <div className="relative flex h-screen min-h-[100dvh] overflow-hidden">
      {/* SIDEBAR - DESKTOP (STAYS AS IS) & MOBILE (HIDDEN BY DEFAULT) */}
      {showSidebar && (
        <>
          {/* Desktop Sidebar */}
          <div className="hidden lg:block">
            <Sidebar />
          </div>

          {/* Mobile Sidebar Overlay */}
          {isMobileSidebarOpen && (
            <button
              type="button"
              className="fixed inset-0 z-40 bg-black/55 lg:hidden"
              onClick={() => setIsMobileSidebarOpen(false)}
              aria-label="Close navigation"
            />
          )}

          {/* Mobile Sidebar Drawer */}
          <div className={`fixed inset-y-0 left-0 z-50 w-72 transform bg-base-100 transition-transform duration-200 ease-out lg:hidden ${isMobileSidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
            <Sidebar onClose={() => setIsMobileSidebarOpen(false)} />
          </div>
        </>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <Navbar onMenuClick={() => setIsMobileSidebarOpen(true)} showMenuButton={showSidebar} />

        <main className="flex-1 min-h-0 overflow-auto relative">{children}</main>
      </div>
    </div>
  );
};
export default Layout;
