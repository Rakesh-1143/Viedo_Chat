import Sidebar from "./Sidebar";
import Navbar from "./Navbar";

const Layout = ({ children, showSidebar = false }) => {
  return (
    <div className="h-screen flex overflow-hidden">
      {showSidebar && <Sidebar />}

      <div className="flex-1 flex flex-col min-w-0">
        <Navbar />

        <main className="flex-1 min-h-0 overflow-hidden">{children}</main>
      </div>
    </div>
  );
};
export default Layout;
