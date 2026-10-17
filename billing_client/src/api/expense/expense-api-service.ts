import HttpClientWrapper from '../http-client-wrapper';
import { pageQuery } from '../page-query';
import { normalizePage, PageResult } from '../../billing/components/ListPagination';

export class ExpenseApiService {
  private http = new HttpClientWrapper();

  types = (page = 0, size = 25) => this.http.get(`/v1/expense/types?${pageQuery(page, size)}`);
  saveType = (payload: { id?: number; name: string }) => this.http.post('/v1/expense/types', payload);
  blockType = (id: number) => this.http.post(`/v1/expense/types/${id}/block`, {});
  saveEntry = (payload: any) => this.http.post('/v1/expense/entries', payload);
  get = (id: number) => this.http.get(`/v1/expense/entries/${id}`);
  update = (id: number, payload: any) => this.http.post(`/v1/expense/entries/${id}`, payload);
  cancel = (id: number, reason: string) => this.http.post(`/v1/expense/entries/${id}/cancel`, { reason });
  editLog = (from: string, to: string, page = 0, size = 25) =>
    this.http.get(`/v1/expense/edit-log?from=${from}&to=${to}&${pageQuery(page, size)}`);
  report = (from: string, to: string, typeId?: number, page = 0, size = 25, customerName?: string, phone?: string) => {
    const params = new URLSearchParams({ from, to, ...Object.fromEntries(new URLSearchParams(pageQuery(page, size))) });
    if (typeId) params.set('typeId', String(typeId));
    if (customerName?.trim()) params.set('customerName', customerName.trim());
    if (phone?.trim()) params.set('phone', phone.trim());
    return this.http.get(`/v1/expense/report?${params}`);
  };
}

export const expenseApi = new ExpenseApiService();

export const expenseData = <T>(res: any): T => {
  if (!res?.success) throw new Error(res?.data?.error || 'Request failed');
  return res.data as T;
};

export const expensePage = <T>(res: any): PageResult<T> => normalizePage(expenseData<T[] | PageResult<T>>(res));

export const expenseError = (err: any, fallback: string) =>
  err?.response?.data?.data?.error || err?.message || fallback;
