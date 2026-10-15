import HttpClientWrapper from '../http-client-wrapper';
import { pageQuery } from '../page-query';
import { normalizePage, PageResult } from '../../billing/components/ListPagination';

export class OrderListApiService {
  private http = new HttpClientWrapper();

  list = (type = 'pending', page = 0, size = 25) =>
    this.http.get(`/v1/orders?type=${encodeURIComponent(type)}&${pageQuery(page, size)}`);
  detail = (id: number) => this.http.get(`/v1/orders/${id}`);
  markOrderDelivered = (id: number) => this.http.post(`/v1/orders/${id}/deliver`, {});
  markItemDelivered = (detailId: number) => this.http.post(`/v1/orders/items/${detailId}/deliver`, {});
}

export const orderApi = new OrderListApiService();

export const orderData = <T>(res: any): T => {
  if (!res?.success) throw new Error(res?.data?.error || 'Request failed');
  return res.data as T;
};

export const orderPage = <T>(res: any): PageResult<T> => normalizePage(orderData<T[] | PageResult<T>>(res));

export const orderError = (err: any, fallback: string) =>
  err?.response?.data?.data?.error || err?.message || fallback;
