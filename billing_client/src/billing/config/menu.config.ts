import { routerPathNames } from '../../routes/routerPathNames';

export interface MenuItemConfig {
  id: string;
  name: string;
  url?: string;
  icon: string;
  moduleId?: number;
  submenus?: MenuItemConfig[];
}

/** Old JSP user_modules IDs — a menu shows only if the user has that module. */
export const MENU_MODULE = {
  billing: 1,
  master: 2,
  stockReports: 3,
  users: 4,
  inventory: 5,
  accountReports: 6,
  admin: 7,
  statistics: 8,
  credit: 10,
  orderList: 11,
  expense: 12,
  bookTicket: 13,
} as const;

export const filterMenuByModules = (items: MenuItemConfig[], moduleIds: number[]): MenuItemConfig[] => {
  const allowed = new Set((moduleIds || []).map(Number));
  return items.filter((item) => item.moduleId == null || allowed.has(item.moduleId));
};

export const hasModuleAccess = (moduleIds: number[] | undefined, moduleId: number): boolean =>
  (moduleIds || []).map(Number).includes(moduleId);

export const defaultAppPath = (moduleIds: number[] | undefined): string =>
  hasModuleAccess(moduleIds, MENU_MODULE.statistics)
    ? routerPathNames.dashboard
    : routerPathNames.ticket.entry;

export const moduleIdForPath = (pathname: string): number | null => {
  if (pathname.includes('/app/users/change-password')) return null;
  if (pathname.includes('/app/statistics') || pathname.includes('/app/dashboard')) return MENU_MODULE.statistics;
  if (pathname.includes('/app/ticket')) return MENU_MODULE.bookTicket;
  if (pathname.includes('/app/credit/customer-balance')) return MENU_MODULE.bookTicket;
  if (pathname.includes('/app/expense')) return null;
  if (pathname.includes('/app/account-reports/day-book')) return null;
  if (pathname.includes('/app/admin/company-details')) return null;
  if (pathname.includes('/app/billing/print')) return null;
  return null;
};

export const billingMenuConfig: MenuItemConfig[] = [
  {
    id: 'dashboard',
    name: 'Dashboard',
    icon: 'fas fa-chart-line',
    moduleId: MENU_MODULE.statistics,
    url: routerPathNames.dashboard,
  },
  {
    id: 'book-ticket',
    name: 'Ticket',
    icon: 'fas fa-ticket-alt',
    moduleId: MENU_MODULE.bookTicket,
    submenus: [
      { id: 'ticket-entry', name: 'Ticket Entry', url: routerPathNames.ticket.entry, icon: 'fas fa-plus-circle' },
      { id: 'customer-balance', name: 'Customers Balance', url: routerPathNames.credit.customerBalance, icon: 'fas fa-wallet' },
    ],
  },
  {
    id: 'reports',
    name: 'Reports',
    icon: 'fas fa-file-alt',
    submenus: [
      { id: 'day-book', name: 'Day Book', url: routerPathNames.accountReports.dayBook, icon: 'fas fa-book' },
      { id: 'expense-entry', name: 'Expense Entry', url: routerPathNames.expense.entry, icon: 'fas fa-receipt' },
      { id: 'expense-type', name: 'Expense Type', url: routerPathNames.expense.type, icon: 'fas fa-tags' },
      { id: 'expense-report', name: 'Expense Report', url: routerPathNames.expense.report, icon: 'fas fa-chart-line' },
      { id: 'company-details', name: 'Company Details', url: routerPathNames.admin.companyDetails, icon: 'fas fa-building' },
    ],
  },
];
