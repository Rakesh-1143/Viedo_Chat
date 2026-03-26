import { Link } from "react-router";
import useAuthUser from "../hooks/useAuthUser";
import { LogOutIcon, MenuIcon, ShipWheelIcon, UserCircleIcon, SettingsIcon } from "lucide-react";
import ThemeSelector from "./ThemeSelector";
import useLogout from "../hooks/useLogout";

<<<<<<< HEAD
const Navbar = () => {
=======
const Navbar = ({ onMenuClick, showMenuButton = false }) => {
>>>>>>> e0242ca (updating onbording page)
  const { authUser } = useAuthUser();
  const { logoutMutation } = useLogout();

  return (
    <nav className="bg-base-200 border-b border-base-300 sticky top-0 z-30 h-16 flex items-center">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
<<<<<<< HEAD
=======
          {/* MOBILE MENU BUTTON */}
          {showMenuButton && (
            <button 
              onClick={onMenuClick}
              className="btn btn-ghost btn-circle lg:hidden"
            >
              <MenuIcon className="size-6" />
            </button>
          )}

>>>>>>> e0242ca (updating onbording page)
          {/* LOGO */}
          <Link to="/" className="flex items-center gap-2.5">
            <ShipWheelIcon className="size-8 text-primary" />
            <span className="text-2xl font-bold font-mono bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary tracking-wider hidden sm:block">
              Streamify
            </span>
          </Link>
        </div>

        <div className="flex items-center gap-2 sm:gap-4 ml-auto">
          {/* HAMBURGER DROPDOWN */}
          <div className="dropdown dropdown-end">
            <div tabIndex={0} role="button" className="btn btn-ghost btn-circle avatar border border-base-300">
              <div className="w-8 sm:w-10 rounded-full">
                {authUser?.profilePic ? (
                  <img 
                    src={authUser.profilePic} 
                    alt="User Avatar" 
                    onError={(e) => {
                      e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(authUser?.fullName || "User")}&background=random`;
                    }}
                  />
                ) : (
                  <MenuIcon className="h-5 w-5 sm:h-6 sm:w-6 m-auto" />
                )}
              </div>
            </div>
            <ul
              tabIndex={0}
              className="menu menu-sm dropdown-content mt-3 z-[1] p-2 shadow bg-base-100 border border-base-300 rounded-box w-52"
            >
              <li className="menu-title px-4 py-2 opacity-50">
                Hi, {authUser?.fullName?.split(" ")[0]}
              </li>
              <div className="divider my-0"></div>
              <li>
                <Link to="/onboarding" className="flex items-center gap-2 py-3">
                  <UserCircleIcon className="h-4 w-4" />
                  Update Profile
                </Link>
              </li>

              <li>
                <Link to="/settings" className="flex items-center gap-2 py-3">
                  <SettingsIcon className="h-4 w-4" />
                  Settings
                </Link>
              </li>
              
              <ThemeSelector isMenuItem={true} />

              <li>
                <button
                  className="flex items-center gap-2 py-3 text-error"
                  onClick={() => logoutMutation()}
                >
                  <LogOutIcon className="h-4 w-4" />
                  Logout
                </button>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </nav>
  );
};
export default Navbar;
