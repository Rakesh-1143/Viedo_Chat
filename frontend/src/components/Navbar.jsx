import { Link } from "react-router";
import {
  LogOutIcon,
  MenuIcon,
  SettingsIcon,
  ShipWheelIcon,
  UserCircleIcon,
} from "lucide-react";
import useAuthUser from "../hooks/useAuthUser";
import useLogout from "../hooks/useLogout";
import ThemeSelector from "./ThemeSelector";

const Navbar = ({ onMenuClick, showMenuButton = false }) => {
  const { authUser } = useAuthUser();
  const { logoutMutation, isPending } = useLogout();

  return (
    <nav className="sticky top-0 z-30 flex h-16 flex-none items-center border-b border-base-300 bg-base-100">
      <div className="flex w-full items-center justify-between px-3 sm:px-5">
        <div className="flex items-center gap-2">
          {showMenuButton && (
            <button
              type="button"
              onClick={onMenuClick}
              className="icon-button lg:hidden"
              aria-label="Open navigation"
              title="Open navigation"
            >
              <MenuIcon aria-hidden="true" />
            </button>
          )}
          <Link to="/" className="brand-mark lg:hidden" aria-label="Streamify home">
            <ShipWheelIcon aria-hidden="true" />
            <span className="hidden sm:inline">Streamify</span>
          </Link>
        </div>

        <div className="dropdown dropdown-end ml-auto">
          <button
            type="button"
            tabIndex={0}
            className="flex h-11 items-center gap-2 rounded-lg border border-base-300 bg-base-100 px-1.5 pr-3 hover:bg-base-200"
            aria-label="Open account menu"
          >
            <div className="avatar">
              <div className="w-8 rounded-full bg-base-200">
                {authUser?.profilePic ? (
                  <img
                    src={authUser.profilePic}
                    alt=""
                    onError={(event) => {
                      event.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(authUser?.fullName || "User")}&background=64748b&color=ffffff`;
                    }}
                  />
                ) : (
                  <UserCircleIcon className="m-1 size-6" aria-hidden="true" />
                )}
              </div>
            </div>
            <span className="hidden max-w-40 truncate text-sm font-semibold sm:block">
              {authUser?.fullName}
            </span>
          </button>

          <ul
            tabIndex={0}
            className="menu dropdown-content z-[1] mt-2 w-56 rounded-lg border border-base-300 bg-base-100 p-2 shadow-xl"
          >
            <li className="menu-title px-3 py-2">
              <span>{authUser?.email}</span>
            </li>
            <li>
              <Link to="/onboarding">
                <UserCircleIcon className="size-4" aria-hidden="true" />
                Edit profile
              </Link>
            </li>
            <li>
              <Link to="/settings">
                <SettingsIcon className="size-4" aria-hidden="true" />
                Settings
              </Link>
            </li>
            <ThemeSelector isMenuItem />
            <li>
              <button
                type="button"
                className="text-error"
                onClick={() => logoutMutation()}
                disabled={isPending}
              >
                <LogOutIcon className="size-4" aria-hidden="true" />
                {isPending ? "Signing out..." : "Sign out"}
              </button>
            </li>
          </ul>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
