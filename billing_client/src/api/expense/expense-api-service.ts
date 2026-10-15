import HttpClientWrapper from '../http-client-wrapper';
import { pageQuery } from '../page-query';
import { normalizePage, PageResult } from '../../billing/components/ListPagination';

export class ExpenseApiService {
  private http = new HttpClientWrapper();

  types = (page = 0, size = 25) => this.http.get(`/v1/expense/types?${pageQuery(page, size)}`);
  saveType = (payload: { id?: number; name: string }) => this.http.post('/v1/expense/types', payload);
  blockType = (id: number) => this.http.post(`/v1/expense/types/${id}/block`, {});
  saveEntry = (payload: any) => this.http.post('/v1/expense/entries', payload);
  report = (from: string, to: string, typeId?: number, page = 0, size = 25) => {
    const params = new URLSearchParams({ from, to, ...Object.fromEntries(new URLSearchParams(pageQuery(page, size))) });
    if (typeId) params.set('typeId', String(typeId));
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
