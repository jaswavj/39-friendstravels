import HttpClientWrapper from '../http-client-wrapper';

export class TicketApiService {
  private http = new HttpClientWrapper();

  searchCustomers = (query?: string, phone?: string) => {
    const params = new URLSearchParams();
    if (query) params.set('query', query);
    if (phone) params.set('phone', phone);
    return this.http.get(`/v1/ticket/customers/search?${params.toString()}`);
  };

  searchPlaces = (q: string) => this.http.get(`/v1/ticket/places?q=${encodeURIComponent(q)}`);

  save = (payload: any) => this.http.post('/v1/ticket/entries', payload);
}

export const ticketApi = new TicketApiService();

export const ticketData = <T>(res: any): T => {
  if (!res?.success) throw new Error(res?.data?.error || 'Request failed');
  return res.data as T;
};

export const ticketError = (err: any, fallback: string) =>
  err?.response?.data?.data?.error || err?.message || fallback;
