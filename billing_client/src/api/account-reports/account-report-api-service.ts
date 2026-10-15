import HttpClientWrapper from '../http-client-wrapper';
import { pageQuery, exportPageQuery } from '../page-query';

const withPage = (base: string, page = 0, size = 25) => `${base}${base.includes('?') ? '&' : '?'}${pageQuery(page, size)}`;

export class AccountReportApiService {
  private http = new HttpClientWrapper();

  sales = (from: string, to: string, mode = 0, type = 0, userId = 0, taxBill = 0, page = 0, size = 25) => {
    const params = new URLSearchParams({ from, to, mode: String(mode), type: String(type) });
    if (userId) params.set('userId', String(userId));
    if (taxBill) params.set('taxBill', String(taxBill));
    params.set('page', String(page));
    params.set('size', String(size));
    return this.http.get(`/v1/account-reports/sales?${params}`);
  };

  salesByCategory = (from: string, to: string, categoryId: number, page = 0, size = 25) =>
    this.http.get(withPage(`/v1/account-reports/sales-by-category?from=${from}&to=${to}&categoryId=${categoryId}`, page, size));

  salesByDepartment = (from: string, to: string, brandId: number, page = 0, size = 25) =>
    this.http.get(withPage(`/v1/account-reports/sales-by-department?from=${from}&to=${to}&brandId=${brandId}`, page, size));

  salesByItem = (from: string, to: string, productId: number, page = 0, size = 25) =>
    this.http.get(withPage(`/v1/account-reports/sales-by-item?from=${from}&to=${to}&productId=${productId}`, page, size));

  salesByCustomer = (from: string, to: string, customerId: number, page = 0, size = 25) =>
    this.http.get(withPage(`/v1/account-reports/sales-by-customer?from=${from}&to=${to}&customerId=${customerId}`, page, size));

  salesByAttender = (from: string, to: string, attenderId = 0, page = 0, size = 25) => {
    const params = new URLSearchParams({ from, to });
    if (attenderId) params.set('attenderId', String(attenderId));
    return this.http.get(withPage(`/v1/account-reports/sales-by-attender?${params}`, page, size));
  };

  dayAccount = (from: string, to: string) =>
    this.http.get(`/v1/account-reports/day-account?from=${from}&to=${to}`);

  dayBook = (from: string, to: string) =>
    this.http.get(`/v1/account-reports/day-book?from=${from}&to=${to}`);

  openingBalances = () => this.http.get('/v1/account-reports/day-book/opening-balances');
  saveOpeningBalance = (payload: any) => this.http.post('/v1/account-reports/day-book/opening-balance', payload);

  commission = (from: string, to: string, customerId: number, page = 0, size = 25) =>
    this.http.get(withPage(`/v1/account-reports/commission?from=${from}&to=${to}&customerId=${customerId}`, page, size));
  commissionCustomers = () => this.http.get('/v1/account-reports/commission-customers');

  gstSalesSummary = (from: string, to: string, page = 0, size = 25) =>
    this.http.get(withPage(`/v1/account-reports/gst/sales-summary?from=${from}&to=${to}`, page, size));
  gstBillWise = (from: string, to: string, page = 0, size = 25) =>
    this.http.get(withPage(`/v1/account-reports/gst/bill-wise?from=${from}&to=${to}`, page, size));
  gstItemWise = (from: string, to: string, page = 0, size = 25) =>
    this.http.get(withPage(`/v1/account-reports/gst/item-wise?from=${from}&to=${to}`, page, size));
  gstHsn = (from: string, to: string, page = 0, size = 25) =>
    this.http.get(withPage(`/v1/account-reports/gst/hsn?from=${from}&to=${to}`, page, size));
  gstr1 = (from: string, to: string) =>
    this.http.get(`/v1/account-reports/gst/gstr1?from=${from}&to=${to}`);
  gstPurchase = (from: string, to: string, page = 0, size = 25) =>
    this.http.get(withPage(`/v1/account-reports/gst/purchase?from=${from}&to=${to}`, page, size));
  gstPurchaseSummary = (from: string, to: string, page = 0, size = 25) =>
    this.http.get(withPage(`/v1/account-reports/gst/purchase-summary?from=${from}&to=${to}`, page, size));

  /** Full export fetch for spreadsheets */
  gstSalesSummaryAll = (from: string, to: string) =>
    this.http.get(`/v1/account-reports/gst/sales-summary?from=${from}&to=${to}&${exportPageQuery()}`);
}

export const accountApi = new AccountReportApiService();

export const accountData = <T>(res: any): T => {
  if (!res?.success) throw new Error(res?.data?.error || 'Request failed');
  return res.data as T;
};

export const accountError = (err: any, fallback: string) =>
  err?.response?.data?.data?.error || err?.message || fallback;
