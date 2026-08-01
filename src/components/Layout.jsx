import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/AuthContext";
import toast from "react-hot-toast";

const navItems = [
  { to: "/", label: "Dashboard", end: true },
  { to: "/drivers", label: "Drivers" },
  { to: "/vehicles", label: "Vehicles" },
  { to: "/timesheets", label: "Timesheets" },
  { to: "/fleet-management", label: "Fleet Management" },
  { to: "/customers", label: "Customers" },
  { to: "/trips", label: "Trips" },
];

export function Layout() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch {
      toast.error("Error logging out");
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-gray-50">
      {/* Sidebar (desktop) / Top bar (mobile) */}
      <aside className="md:w-56 bg-gray-900 text-white flex md:flex-col">
        <div className="p-4 font-bold text-lg border-b border-gray-800 hidden md:block">
          White Line FleetDesk
        </div>
        <nav className="flex md:flex-col flex-1 overflow-x-auto md:overflow-visible">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `px-4 py-3 text-sm font-medium whitespace-nowrap border-b md:border-b-0 md:border-l-4 ${
                  isActive
                    ? "bg-gray-800 border-blue-500 text-white"
                    : "border-transparent text-gray-300 hover:bg-gray-800 hover:text-white"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <button
          onClick={handleLogout}
          className="px-4 py-3 text-sm font-medium text-gray-300 hover:bg-gray-800 hover:text-white text-left md:mt-auto border-t border-gray-800"
        >
          Log Out
        </button>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
