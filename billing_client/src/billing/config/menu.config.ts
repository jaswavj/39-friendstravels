import { routerPathNames } from '../../routes/routerPathNames';

export interface MenuItemConfig {
  id: string;
  name: string;
  url?: string;
  icon: string;
  moduleId?: number;
  submenus?: MenuItemConfig[];
}

export const MENU_MODULE = {
  dashboard: 1,
  bookTicket: 2,
  credit: 3,
  ticketReport: 4,
  expense: 5,
  admin: 6,
} as const;

export const filterMenuByModules = (items: MenuItemConfig[], moduleIds: number[]): MenuItemConfig[] => {
  const allowed = new Set((moduleIds || []).map(Number));
  return items.filter((item) => item.moduleId == null || allowed.has(item.moduleId));
};

export const hasModuleAccess = (moduleIds: number[] | undefined, moduleId: number): boolean =>
  (moduleIds || []).map(Number).includes(moduleId);

export const defaultAppPath = (moduleIds: number[] | undefined): string => {
  if (hasModuleAccess(moduleIds, MENU_MODULE.dashboard)) return routerPathNames.dashboard;
  if (hasModuleAccess(moduleIds, MENU_MODULE.bookTicket)) return routerPathNames.ticket.entry;
  if (hasModuleAccess(moduleIds, MENU_MODULE.credit)) return routerPathNames.credit.customerBalance;
  if (hasModuleAccess(moduleIds, MENU_MODULE.ticketReport)) return routerPathNames.ticket.report;
  if (hasModuleAccess(moduleIds, MENU_MODULE.expense)) return routerPathNames.expense.entry;
  if (hasModuleAccess(moduleIds, MENU_MODULE.admin)) return routerPathNames.admin.companyDetails;
  return routerPathNames.dashboard;
};

export const moduleIdForPath = (pathname: string): number | null => {
  if (pathname.includes('/app/users/change-password')) return null;
  if (pathname.includes('/app/billing/print')) return null;
  if (pathname.includes('/app/statistics') || pathname.includes('/app/dashboard')) return MENU_MODULE.dashboard;
  if (pathname.includes('/app/ticket/report') || pathname.includes('/app/ticket/booking-report') || pathname.includes('/app/account-reports/day-book')) return MENU_MODULE.ticketReport;
  if (pathname.includes('/app/ticket')) return MENU_MODULE.bookTicket;
  if (pathname.includes('/app/credit')) return MENU_MODULE.credit;
  if (pathname.includes('/app/expense')) return MENU_MODULE.expense;
  if (pathname.includes('/app/users') || pathname.includes('/app/admin')) return MENU_MODULE.admin;
  return null;
};

export const billingMenuConfig: MenuItemConfig[] = [
  {
    id: 'book-ticket',
    name: 'Book Ticket Entry',
    icon: 'fas fa-ticket-alt',
    moduleId: MENU_MODULE.bookTicket,
    url: routerPathNames.ticket.entry,
  },
  {
    id: 'credit',
    name: 'Customers Balance',
    icon: 'fas fa-wallet',
    moduleId: MENU_MODULE.credit,
    url: routerPathNames.credit.customerBalance,
  },
  {
    id: 'ticket-report',
    name: 'Income Report',
    icon: 'fas fa-file-alt',
    moduleId: MENU_MODULE.ticketReport,
    submenus: [
      { id: 'ticket-list', name: 'Income Report', url: routerPathNames.ticket.report, icon: 'fas fa-list' },
      { id: 'ticket-booking-report', name: 'Ticket Report', url: routerPathNames.ticket.bookingReport, icon: 'fas fa-ticket-alt' },
    ],
  },
  {
    id: 'expense',
    name: 'Expense',
    icon: 'fas fa-money-bill-wave',
    moduleId: MENU_MODULE.expense,
    submenus: [
      { id: 'expense-type', name: 'Expense Type', url: routerPathNames.expense.type, icon: 'fas fa-tags' },
      { id: 'expense-entry', name: 'Expense Entry', url: routerPathNames.expense.entry, icon: 'fas fa-receipt' },
      { id: 'expense-report', name: 'Expense Report', url: routerPathNames.expense.report, icon: 'fas fa-chart-line' },
    ],
  },
  {
    id: 'admin',
    name: 'Admin',
    icon: 'fas fa-cog',
    moduleId: MENU_MODULE.admin,
    submenus: [
      { id: 'create-user', name: 'Create User', url: routerPathNames.users.create, icon: 'fas fa-user-plus' },
      { id: 'permission', name: 'Module Permission', url: routerPathNames.users.permission, icon: 'fas fa-key' },
      { id: 'company-details', name: 'Company Details', url: routerPathNames.admin.companyDetails, icon: 'fas fa-building' },
      { id: 'monthly-bills', name: 'Ticket/Income Edit', url: routerPathNames.admin.monthlyBills, icon: 'fas fa-ticket-alt' },
      { id: 'monthly-expenses', name: 'Expense Edit', url: routerPathNames.admin.monthlyExpenses, icon: 'fas fa-pen' },
      { id: 'edit-log', name: 'Ticket/Income Log', url: routerPathNames.admin.editLog, icon: 'fas fa-history' },
      { id: 'expense-edit-log', name: 'Expense Edit Log', url: routerPathNames.admin.expenseEditLog, icon: 'fas fa-clipboard-list' },
    ],
  },
];
