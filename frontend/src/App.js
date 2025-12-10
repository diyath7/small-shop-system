// src/App.js
import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import { AuthProvider } from "./context/AuthContext";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import SalesPage from "./pages/SalesPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import InvoiceCreatePage from "./pages/InvoiceCreatePage";
import StockPage from "./pages/StockPage";
import PurchaseOrdersPage from "./pages/PurchaseOrdersPage";
import PaymentsPage from "./pages/PaymentsPage";
import UserManagementPage from "./pages/UserManagementPage";
import ReportsPage from "./pages/ReportsPage";
import ProductManagementPage from "./pages/ProductManagementPage";
import SupplierManagementPage from "./pages/SupplierManagementPage";
import InvoicesPage from "./pages/InvoicesPage";
import ExpiredStockPage from "./pages/ExpiredStockPage";

import ProtectedRoute from "./routes/ProtectedRoute";

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public pages */}
          <Route path="/" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />

          {/* Dashboard – only ADMIN + MANAGER (matches backend) */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute allowedRoles={["ADMIN", "MANAGER"]}>
                <DashboardPage />
              </ProtectedRoute>
            }
          />

          {/* Sales – only ADMIN + MANAGER */}
          <Route
            path="/sales"
            element={
              <ProtectedRoute allowedRoles={["ADMIN", "MANAGER"]}>
                <SalesPage />
              </ProtectedRoute>
            }
          />

          {/* Invoices list – all roles */}
          <Route
            path="/invoices"
            element={
              <ProtectedRoute allowedRoles={["ADMIN", "MANAGER", "CASHIER"]}>
                <InvoicesPage />
              </ProtectedRoute>
            }
          />

          {/* Create invoice – all roles */}
          <Route
            path="/invoices/new"
            element={
              <ProtectedRoute allowedRoles={["ADMIN", "MANAGER", "CASHIER"]}>
                <InvoiceCreatePage />
              </ProtectedRoute>
            }
          />

          {/* Stock – admin + manager */}
          <Route
            path="/stock"
            element={
              <ProtectedRoute allowedRoles={["ADMIN", "MANAGER"]}>
                <StockPage />
              </ProtectedRoute>
            }
          />

          {/* Expired stock – admin + manager */}
          <Route
            path="/stock/expired"
            element={
              <ProtectedRoute allowedRoles={["ADMIN", "MANAGER"]}>
                <ExpiredStockPage />
              </ProtectedRoute>
            }
          />

          {/* Purchase Orders – admin + manager */}
          <Route
            path="/purchase-orders"
            element={
              <ProtectedRoute allowedRoles={["ADMIN", "MANAGER"]}>
                <PurchaseOrdersPage />
              </ProtectedRoute>
            }
          />

          {/* Payments – admin + manager */}
          <Route
            path="/payments"
            element={
              <ProtectedRoute allowedRoles={["ADMIN", "MANAGER"]}>
                <PaymentsPage />
              </ProtectedRoute>
            }
          />

          {/* User management – admin + manager */}
          <Route
            path="/users"
            element={
              <ProtectedRoute allowedRoles={["ADMIN", "MANAGER"]}>
                <UserManagementPage />
              </ProtectedRoute>
            }
          />

          {/* Products – admin + manager */}
          <Route
            path="/products/new"
            element={
              <ProtectedRoute allowedRoles={["ADMIN", "MANAGER"]}>
                <ProductManagementPage />
              </ProtectedRoute>
            }
          />

          {/* Supplier management – admin + manager */}
          <Route
            path="/suppliers"
            element={
              <ProtectedRoute allowedRoles={["ADMIN", "MANAGER"]}>
                <SupplierManagementPage />
              </ProtectedRoute>
            }
          />

          {/* Reports – admin + manager */}
          <Route
            path="/reports"
            element={
              <ProtectedRoute allowedRoles={["ADMIN", "MANAGER"]}>
                <ReportsPage />
              </ProtectedRoute>
            }
          />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
