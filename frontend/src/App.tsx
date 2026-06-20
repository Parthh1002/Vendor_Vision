import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { ThemeProvider } from "./contexts/ThemeContext";

// Layouts & Pages
import DashboardLayout from "./layouts/DashboardLayout";
import Login from "./pages/Login";
import Unauthorized from "./pages/Unauthorized";
import Dashboard from "./pages/Dashboard";
import Vendors from "./pages/Vendors";
import RFQs from "./pages/RFQs";
import Quotations from "./pages/Quotations";
import PurchaseOrders from "./pages/PurchaseOrders";
import Invoices from "./pages/Invoices";

// Protected Route Wrapper with Role-Based Access Control (RBAC)
interface ProtectedRouteProps {
  children: React.ReactElement;
  allowedRoles?: string[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { isAuthenticated, user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-3 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};

// Home index redirect: vendors go to /rfqs supplier portal directly
const HomeRedirect: React.FC = () => {
  const { user } = useAuth();
  if (user?.role === "vendor") {
    return <Navigate to="/rfqs" replace />;
  }
  return <Dashboard />;
};

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Guest Auth Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/unauthorized" element={<Unauthorized />} />

            {/* Protected ERP Dashboard Layout */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              {/* Home Redirect (Dashboard or Portal) */}
              <Route index element={<HomeRedirect />} />

              {/* Vendors - Restricted to Internal Roles */}
              <Route
                path="vendors"
                element={
                  <ProtectedRoute allowedRoles={["admin", "procurement_officer", "manager"]}>
                    <Vendors />
                  </ProtectedRoute>
                }
              />

              {/* RFQs - Accessible to all authorized users (vendors see invited, staff see all) */}
              <Route path="rfqs" element={<RFQs />} />

              {/* Quotations - Audit Trail ledger */}
              <Route path="quotations" element={<Quotations />} />

              {/* Purchase Orders */}
              <Route path="purchase-orders" element={<PurchaseOrders />} />

              {/* Invoices */}
              <Route path="invoices" element={<Invoices />} />
            </Route>

            {/* Fallback Catch-all route */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
