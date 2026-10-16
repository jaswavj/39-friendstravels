import HttpClientWrapper from '../http-client-wrapper';
import { pageQuery } from '../page-query';
import { normalizePage, PageResult } from '../../billing/components/ListPagination';

export class TicketApiService {
  private http = new HttpClientWrapper();

  searchCustomers = (query?: string, phone?: string) => {
    const params = new URLSearchParams();
    if (query) params.set('query', query);
    if (phone) params.set('phone', phone);
    return this.http.get(`/v1/ticket/customers/search?${params.toString()}`);
  };

  searchPlaces = (q: string) => this.http.get(`/v1/ticket/places?q=${encodeURIComponent(q)}`);

  searchIncomeTypes = (q: string) => this.http.get(`/v1/ticket/income-types?q=${encodeURIComponent(q)}`);

  save = (payload: any) => this.http.post('/v1/ticket/entries', payload);

  get = (id: number) => this.http.get(`/v1/ticket/entries/${id}`);

  update = (id: number, payload: any) => this.http.post(`/v1/ticket/entries/${id}`, payload);

  logView = (id: number) => this.http.post(`/v1/ticket/entries/${id}/view`, {});

  cancel = (id: number, reason: string) => this.http.post(`/v1/ticket/entries/${id}/cancel`, { reason });

  report = (from: string, to: string, page = 0, size = 25, customerName?: string, phone?: string, kind?: string, incomeType?: string) => {
    const params = new URLSearchParams();
    params.set('from', from);
    params.set('to', to);
    if (customerName?.trim()) params.set('customerName', customerName.trim());
    if (phone?.trim()) params.set('phone', phone.trim());
    if (kind?.trim()) params.set('kind', kind.trim());
    if (incomeType?.trim()) params.set('incomeType', incomeType.trim());
    return this.http.get(`/v1/ticket/report?${params.toString()}&${pageQuery(page, size)}`);
  };
}

export const ticketApi = new TicketApiService();

export const ticketData = <T>(res: any): T => {
  if (!res?.success) throw new Error(res?.data?.error || 'Request failed');
  return res.data as T;
};

export const ticketPage = <T>(res: any): PageResult<T> => normalizePage(ticketData<T[] | PageResult<T>>(res));

export const ticketError = (err: any, fallback: string) =>
  err?.response?.data?.data?.error || err?.message || fallback;
