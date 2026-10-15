import HttpClientWrapper from '../http-client-wrapper';
import { pageQuery } from '../page-query';
import { normalizePage, PageResult } from '../../billing/components/ListPagination';

export class MasterApiService {
  private http = new HttpClientWrapper();

  lookups = () => this.http.get('/v1/master/lookups');

  categories = (page = 0, size = 25, q?: string) =>
    this.http.get(`/v1/master/categories?${pageQuery(page, size, { q })}`);
  categoriesAll = () => this.http.get('/v1/master/categories/all');
  saveCategory = (payload: any) => this.http.post('/v1/master/categories', payload);
  blockCategory = (id: number) => this.http.post(`/v1/master/categories/${id}/block`, {});

  brands = (page = 0, size = 25, q?: string) =>
    this.http.get(`/v1/master/brands?${pageQuery(page, size, { q })}`);
  brandsAll = () => this.http.get('/v1/master/brands/all');
  saveBrand = (payload: any) => this.http.post('/v1/master/brands', payload);
  blockBrand = (id: number) => this.http.post(`/v1/master/brands/${id}/block`, {});

  units = (page = 0, size = 25, q?: string) =>
    this.http.get(`/v1/master/units?${pageQuery(page, size, { q })}`);
  saveUnit = (payload: any) => this.http.post('/v1/master/units', payload);
  unitStatus = (id: number, active: number) => this.http.post(`/v1/master/units/${id}/status?active=${active}`, {});

  customers = (page = 0, size = 25, q?: string) =>
    this.http.get(`/v1/master/customers?${pageQuery(page, size, { q })}`);
  customersAll = () => this.http.get('/v1/master/customers/all');
  saveCustomer = (payload: any) => this.http.post('/v1/master/customers', payload);
  blockCustomer = (id: number) => this.http.post(`/v1/master/customers/${id}/block`, {});

  products = (page = 0, size = 25, q?: string) =>
    this.http.get(`/v1/master/products?${pageQuery(page, size, { q })}`);
  productOptions = () => this.http.get('/v1/master/product-options');
  saveProduct = (payload: any) => this.http.post('/v1/master/products', payload);
  blockProduct = (id: number) => this.http.post(`/v1/master/products/${id}/block`, {});

  stockProducts = (page = 0, size = 25, q?: string) =>
    this.http.get(`/v1/master/stock/products?${pageQuery(page, size, { q })}`);
  adjustStock = (payload: any) => this.http.post('/v1/master/stock/adjust', payload);

  components = (productId: number) => this.http.get(`/v1/master/components?productId=${productId}`);
  saveComponent = (payload: any) => this.http.post('/v1/master/components', payload);
  deleteComponent = (id: number) => this.http.delete(`/v1/master/components/${id}`);

  tables = (page = 0, size = 25, q?: string) =>
    this.http.get(`/v1/master/tables?${pageQuery(page, size, { q })}`);
  saveTable = (payload: any) => this.http.post('/v1/master/tables', payload);
  deleteTable = (id: number) => this.http.delete(`/v1/master/tables/${id}`);

  bulkProducts = (name?: string, categoryId?: number, page = 0, size = 25) => {
    const params = new URLSearchParams(pageQuery(page, size));
    if (name) params.set('name', name);
    if (categoryId) params.set('categoryId', String(categoryId));
    return this.http.get(`/v1/master/bulk-products?${params.toString()}`);
  };
  bulkUpdate = (payload: any) => this.http.post('/v1/master/bulk-products', payload);

  barcodes = (page = 0, size = 25, q?: string) =>
    this.http.get(`/v1/master/barcodes?${pageQuery(page, size, { q })}`);
  printBarcodes = (payload: any) => this.http.post('/v1/master/barcodes/print', payload);
}

export const masterApi = new MasterApiService();

export const masterData = <T>(res: any): T => {
  if (!res?.success) {
    throw new Error(res?.data?.error || 'Request failed');
  }
  return res.data as T;
};

export const masterPage = <T>(res: any): PageResult<T> => normalizePage(masterData<T[] | PageResult<T>>(res));

export const masterError = (err: any, fallback: string) =>
  err?.response?.data?.data?.error || err?.message || fallback;
