const API_BASE = '';

class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${path}`;
  const isFormData = options?.body instanceof FormData;
  // Для FormData не выставляем Content-Type вручную — браузер сам проставит
  // multipart/form-data с корректным boundary. Для остальных запросов —
  // дефолтный JSON, при этом пользовательский headers имеет приоритет.
  const headers: HeadersInit = isFormData
    ? { ...(options?.headers ?? {}) }
    : { 'Content-Type': 'application/json', ...(options?.headers ?? {}) };
  const res = await fetch(url, { ...options, headers });
  if (!res.ok) {
    const text = await res.text();
    let msg = text;
    try {
      const parsed = JSON.parse(text);
      if (parsed.error || parsed.message) {
        msg = parsed.error || parsed.message;
      }
    } catch {
      // not JSON, keep raw text
    }
    throw new ApiError(msg || `HTTP ${res.status}`, res.status);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export { request, ApiError };
