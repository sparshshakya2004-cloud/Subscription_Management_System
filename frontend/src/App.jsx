import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import Layout from './components/Layout';

// Auth Pages
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';

// Dashboards
import AdminDashboard from './pages/dashboard/AdminDashboard';
import StaffDashboard from './pages/dashboard/StaffDashboard';
import FinanceDashboard from './pages/dashboard/FinanceDashboard';

// Modules
import ProductsPage from './pages/products/ProductsPage';
import PlansPage from './pages/plans/PlansPage';
import QuotationsPage from './pages/quotations/QuotationsPage';
import SubscriptionsPage from './pages/subscriptions/SubscriptionsPage';
import InvoicesPage from './pages/invoices/InvoicesPage';
import PaymentsPage from './pages/payments/PaymentsPage';
import TaxesPage from './pages/taxes/TaxesPage';
import DiscountsPage from './pages/discounts/DiscountsPage';
import CustomersPage from './pages/customers/CustomersPage';
import UsersPage from './pages/users/UsersPage';

// Customer Portal
import CustomerPortalOverview from './pages/portal/CustomerPortalOverview';
import CustomerSubscriptions from './pages/portal/CustomerSubscriptions';
import CustomerInvoices from './pages/portal/CustomerInvoices';
import CustomerProfile from './pages/portal/CustomerProfile';

// Route Guards
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, token, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900 text-white">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    if (user.role === 'Admin') return <Navigate to="/admin" replace />;
    if (user.role === 'Internal Staff') return <Navigate to="/staff" replace />;
    return <Navigate to="/portal" replace />;
  }

  return children;
};

const RootRedirect = () => {
  const { user, token, loading } = useAuth();
  if (loading) return null;
  if (!token || !user) return <Navigate to="/login" replace />;
  if (user.role === 'Admin') return <Navigate to="/admin" replace />;
  if (user.role === 'Internal Staff') return <Navigate to="/staff" replace />;
  return <Navigate to="/portal" replace />;
};

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Auth Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            {/* Root Dispatcher */}
            <Route path="/" element={<RootRedirect />} />

            {/* Authenticated Application Routes */}
            <Route
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              {/* Admin Routes */}
              <Route
                path="/admin"
                element={
                  <ProtectedRoute allowedRoles={['Admin']}>
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/products"
                element={
                  <ProtectedRoute allowedRoles={['Admin', 'Internal Staff']}>
                    <ProductsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/plans"
                element={
                  <ProtectedRoute allowedRoles={['Admin', 'Internal Staff']}>
                    <PlansPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/taxes"
                element={
                  <ProtectedRoute allowedRoles={['Admin']}>
                    <TaxesPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/discounts"
                element={
                  <ProtectedRoute allowedRoles={['Admin']}>
                    <DiscountsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/users"
                element={
                  <ProtectedRoute allowedRoles={['Admin']}>
                    <UsersPage />
                  </ProtectedRoute>
                }
              />

              {/* Staff & Admin Shared Routes */}
              <Route
                path="/staff"
                element={
                  <ProtectedRoute allowedRoles={['Internal Staff', 'Admin']}>
                    <StaffDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/finance"
                element={
                  <ProtectedRoute allowedRoles={['Admin', 'Internal Staff']}>
                    <FinanceDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/subscriptions"
                element={
                  <ProtectedRoute allowedRoles={['Admin', 'Internal Staff']}>
                    <SubscriptionsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/quotations"
                element={
                  <ProtectedRoute allowedRoles={['Admin', 'Internal Staff']}>
                    <QuotationsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/invoices"
                element={
                  <ProtectedRoute allowedRoles={['Admin', 'Internal Staff']}>
                    <InvoicesPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/payments"
                element={
                  <ProtectedRoute allowedRoles={['Admin', 'Internal Staff']}>
                    <PaymentsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/customers"
                element={
                  <ProtectedRoute allowedRoles={['Admin', 'Internal Staff']}>
                    <CustomersPage />
                  </ProtectedRoute>
                }
              />

              {/* Customer Portal Routes */}
              <Route
                path="/portal"
                element={
                  <ProtectedRoute allowedRoles={['Customer']}>
                    <CustomerPortalOverview />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/portal/subscriptions"
                element={
                  <ProtectedRoute allowedRoles={['Customer']}>
                    <CustomerSubscriptions />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/portal/invoices"
                element={
                  <ProtectedRoute allowedRoles={['Customer']}>
                    <CustomerInvoices />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/portal/payments"
                element={
                  <ProtectedRoute allowedRoles={['Customer']}>
                    <CustomerInvoices />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/portal/profile"
                element={
                  <ProtectedRoute allowedRoles={['Customer']}>
                    <CustomerProfile />
                  </ProtectedRoute>
                }
              />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
