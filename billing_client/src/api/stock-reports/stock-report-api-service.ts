import HttpClientWrapper from '../http-client-wrapper';
import { pageQuery } from '../page-query';
import { normalizePage, PageResult } from '../../billing/components/ListPagination';

export class StockReportApiService {
  private http = new HttpClientWrapper();

  products = () => this.http.get('/v1/stock-reports/products');
  currentStock = (page = 0, size = 25) =>
    this.http.get(`/v1/stock-reports/current-stock?${pageQuery(page, size)}`);
  transactions = (from: string, to: string, productId?: number, page = 0, size = 25) => {
    const params = new URLSearchParams({ from, to, ...Object.fromEntries(new URLSearchParams(pageQuery(page, size))) });
    if (productId) params.set('productId', String(productId));
    return this.http.get(`/v1/stock-reports/transactions?${params}`);
  };
  adjustments = (from: string, to: string, productId?: number, stockType?: number, page = 0, size = 25) => {
    const params = new URLSearchParams({ from, to, ...Object.fromEntries(new URLSearchParams(pageQuery(page, size))) });
    if (productId) params.set('productId', String(productId));
    if (stockType) params.set('stockType', String(stockType));
    return this.http.get(`/v1/stock-reports/adjustments?${params}`);
  };
}

export const stockApi = new StockReportApiService();

export const stockData = <T>(res: any): T => {
  if (!res?.success) throw new Error(res?.data?.error || 'Request failed');
  return res.data as T;
};

export const stockPage = <T>(res: any): PageResult<T> => normalizePage(stockData<T[] | PageResult<T>>(res));

export const stockError = (err: any, fallback: string) =>
  err?.response?.data?.data?.error || err?.message || fallback;
