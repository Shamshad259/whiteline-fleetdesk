import { Toaster } from "react-hot-toast";
import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./hooks/useAuth";
import { useAuth } from "./hooks/AuthContext";
import { Login } from "./pages/Login";
import { Layout } from "./components/Layout";
import { DriverTimesheetForm } from "./pages/DriverTimesheetForm";
import { Vehicles } from "./pages/Vehicles";
import { FleetManagement } from "./pages/FleetManagement";
import { Drivers } from "./pages/Drivers";
import { Timesheets } from "./pages/Timesheets";
import { Trips } from "./pages/Trips";
import { Dashboard } from "./pages/Dashboard";
import { Customers } from "./pages/Customers";
import { CustomerProfile } from "./pages/CustomerProfile";

function PrivateRoute({ children }) {
  const { currentUser } = useAuth();
  return currentUser ? children : <Navigate to="/login" />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/timesheet/:token" element={<DriverTimesheetForm />} />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="drivers" element={<Drivers />} />
        <Route path="vehicles" element={<Vehicles />} />
        <Route path="timesheets" element={<Timesheets />} />
        <Route path="fleet-management" element={<FleetManagement />} />
        <Route path="customers" element={<Customers />} />
        <Route path="customers/:customerId" element={<CustomerProfile />} />
        <Route path="trips" element={<Trips />} />
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <Toaster position="top-right" />
      <AppRoutes />
    </AuthProvider>
  );
}

export default App;
