import { lazy, Suspense, type ReactElement } from 'react';
import { HashRouter as Router, Navigate, Route, Routes } from 'react-router-dom';
import Login from '../login/Login';

const MainLayout = lazy(() => import('../main-layout/MainLayout'));
const AuthGuard = lazy(() => import('../auth-guard/AuthGuard'));
const SidebarProvider = lazy(() =>
  import('../context/SidebarContext').then((m) => ({ default: m.SidebarProvider }))
);
const BillingLayout = lazy(() => import('../billing/BillingLayout'));
const ModuleAccessGuard = lazy(() => import('../billing/components/ModuleAccessGuard'));
const DefaultAppRedirect = lazy(() =>
  import('../billing/components/ModuleAccessGuard').then((m) => ({ default: m.DefaultAppRedirect }))
);
const Dashboard = lazy(() => import('../billing/pages/Dashboard'));
const PrintBill = lazy(() => import('../billing/pages/PrintBill'));
const CustomerBalancePage = lazy(() => import('../billing/pages/credit/CustomerBalancePage'));
const ChangePasswordPage = lazy(() => import('../billing/pages/users/ChangePasswordPage'));
const CompanyDetailsPage = lazy(() => import('../billing/pages/admin/CompanyDetailsPage'));
const ExpenseTypePage = lazy(() => import('../billing/pages/expense/ExpenseTypePage'));
const ExpenseEntryPage = lazy(() => import('../billing/pages/expense/ExpenseEntryPage'));
const ExpenseReportPage = lazy(() => import('../billing/pages/expense/ExpenseReportPage'));
const TicketEntryPage = lazy(() => import('../billing/pages/ticket/TicketEntryPage'));
const DayBookPage = lazy(() => import('../billing/pages/account-reports/DayBookPage'));

const guard = (element: ReactElement) => <AuthGuard component={element} />;

const AppRouter = () => {
  return (
    <Router>
      <Suspense fallback={<div style={{ padding: 24, textAlign: 'center' }}>Loading…</div>}>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          <Route
            element={guard(
              <SidebarProvider>
                <MainLayout />
              </SidebarProvider>
            )}
          >
            <Route path="/app" element={<BillingLayout />}>
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="users/change-password" element={<ChangePasswordPage />} />
              <Route path="billing/print/:billNo" element={<PrintBill />} />
              <Route element={<ModuleAccessGuard />}>
              <Route path="account-reports/day-book" element={<DayBookPage />} />
              <Route path="credit/customer-balance" element={<CustomerBalancePage />} />
              <Route path="admin/company-details" element={<CompanyDetailsPage />} />
              <Route path="expense/type" element={<ExpenseTypePage />} />
              <Route path="expense/entry" element={<ExpenseEntryPage />} />
              <Route path="expense/report" element={<ExpenseReportPage />} />
              <Route path="ticket/entry" element={<TicketEntryPage />} />
              </Route>
              <Route index element={<DefaultAppRedirect />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Suspense>
    </Router>
  );
};

export default AppRouter;
