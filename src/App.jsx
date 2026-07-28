import { Toaster } from "react-hot-toast";
import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./hooks/useAuth";
import { useAuth } from "./hooks/AuthContext";
import { Login } from "./pages/Login";
import { Layout } from "./components/Layout";
import { Vehicles } from "./pages/Vehicles";
import { FleetManagement } from "./pages/FleetManagement";
import { Drivers } from "./pages/Drivers";
import { Rates } from "./pages/Rates";

function PrivateRoute({ children }) {
  const { currentUser } = useAuth();
  return currentUser ? children : <Navigate to="/login" />;
}

function Placeholder({ title }) {
  return <h1 className="p-6 text-2xl font-bold text-gray-900">{title}</h1>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }
      >
        <Route index element={<Placeholder title="Dashboard" />} />
        <Route path="drivers" element={<Drivers />} />
        <Route path="vehicles" element={<Vehicles />} />
        <Route path="fleet-management" element={<FleetManagement />} />
        <Route path="customers" element={<Placeholder title="Customers" />} />
        <Route path="rates" element={<Rates />} />
        <Route path="trips" element={<Placeholder title="Trips" />} />
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
