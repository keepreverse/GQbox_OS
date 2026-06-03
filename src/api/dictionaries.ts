import { request } from './client';

type DictType = 'categories' | 'models' | 'colors' | 'suppliers' | 'connectors' | 'chargingProtocols' | 'materials';

export const dictionariesApi = {
  getAll: <T>(type: DictType) => request<T[]>(`/dictionaries/${type}`),

  add: <T>(type: DictType, item: T) => request<T>(`/dictionaries/${type}`, {
    method: 'POST',
    body: JSON.stringify(item),
  }),

  update: <T>(type: DictType, id: string, data: Partial<T>) => request<T>(`/dictionaries/${type}/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),

  remove: (type: DictType, id: string) => request<void>(`/dictionaries/${type}/${id}`, { method: 'DELETE' }),
};

export const exportApi = {
  exportAll: () => request<Record<string, unknown[]>>('/export'),

  importAll: (data: Record<string, unknown[]>) => request<{ ok: boolean }>('/import', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  reset: () => request<{ ok: boolean }>('/reset', { method: 'POST' }),
};
