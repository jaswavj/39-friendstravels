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
const CreateUserPage = lazy(() => import('../billing/pages/users/CreateUserPage'));
const ModulePermissionPage = lazy(() => import('../billing/pages/users/PermissionPage'));
const ChangePasswordPage = lazy(() => import('../billing/pages/users/ChangePasswordPage'));
const CompanyDetailsPage = lazy(() => import('../billing/pages/admin/CompanyDetailsPage'));
const EditBillPage = lazy(() => import('../billing/pages/admin/EditBillPage'));
const MonthlyBillsPage = lazy(() => import('../billing/pages/admin/MonthlyBillsPage'));
const MonthlyExpensesPage = lazy(() => import('../billing/pages/admin/MonthlyExpensesPage'));
const EditLogPage = lazy(() => import('../billing/pages/admin/EditLogPage'));
const ExpenseEditLogPage = lazy(() => import('../billing/pages/admin/ExpenseEditLogPage'));
const ChangePaymentTypePage = lazy(() => import('../billing/pages/admin/ChangePaymentTypePage'));
const BillDateChangeReportPage = lazy(() => import('../billing/pages/admin/BillDateChangeReportPage'));
const CancelBillReportPage = lazy(() => import('../billing/pages/admin/CancelBillReportPage'));
const PaymentTypeChangeReportPage = lazy(() => import('../billing/pages/admin/PaymentTypeChangeReportPage'));
const ExpenseTypePage = lazy(() => import('../billing/pages/expense/ExpenseTypePage'));
const ExpenseEntryPage = lazy(() => import('../billing/pages/expense/ExpenseEntryPage'));
const ExpenseReportPage = lazy(() => import('../billing/pages/expense/ExpenseReportPage'));
const TicketEntryPage = lazy(() => import('../billing/pages/ticket/TicketEntryPage'));
const TicketReportPage = lazy(() => import('../billing/pages/ticket/TicketReportPage'));
const TicketBookingReportPage = lazy(() => import('../billing/pages/ticket/TicketBookingReportPage'));
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
              <Route path="users/create" element={<CreateUserPage />} />
              <Route path="users/permission" element={<ModulePermissionPage />} />
              <Route path="admin/company-details" element={<CompanyDetailsPage />} />
              <Route path="admin/edit-bill" element={<EditBillPage />} />
              <Route path="admin/monthly-bills" element={<MonthlyBillsPage />} />
              <Route path="admin/edit-ticket/:id" element={<TicketEntryPage />} />
              <Route path="admin/monthly-expenses" element={<MonthlyExpensesPage />} />
              <Route path="admin/edit-expense/:id" element={<ExpenseEntryPage />} />
              <Route path="admin/edit-log" element={<EditLogPage />} />
              <Route path="admin/expense-edit-log" element={<ExpenseEditLogPage />} />
              <Route path="admin/change-payment-type" element={<ChangePaymentTypePage />} />
              <Route path="admin/bill-date-change-report" element={<BillDateChangeReportPage />} />
              <Route path="admin/cancel-bill-report" element={<CancelBillReportPage />} />
              <Route path="admin/payment-type-change-report" element={<PaymentTypeChangeReportPage />} />
              <Route path="expense/type" element={<ExpenseTypePage />} />
              <Route path="expense/entry" element={<ExpenseEntryPage />} />
              <Route path="expense/report" element={<ExpenseReportPage />} />
              <Route path="ticket/entry" element={<TicketEntryPage />} />
              <Route path="ticket/report" element={<TicketReportPage />} />
              <Route path="ticket/booking-report" element={<TicketBookingReportPage />} />
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
