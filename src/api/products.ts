import { request } from './client';
import type { RawProduct } from '../data/products';

type NewProduct = Omit<RawProduct, 'id'> & { id?: string };

export const productsApi = {
  getAll: () => request<RawProduct[]>('/products'),

  getById: (id: string) => request<RawProduct>(`/products/${id}`),

  search: (q: string) => request<RawProduct[]>(`/products/search?q=${encodeURIComponent(q)}`),

  create: (raw: NewProduct) =>
    request<RawProduct>('/products', {
      method: 'POST',
      body: JSON.stringify(raw),
    }),

  update: (id: string, data: Partial<RawProduct>) =>
    request<RawProduct>(`/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  remove: (id: string) => request<void>(`/products/${id}`, { method: 'DELETE' }),
};
