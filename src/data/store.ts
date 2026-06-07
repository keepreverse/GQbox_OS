const STORAGE_PREFIX = 'gqbox_';

export type StoreKey = 'products' | 'dictionaries' | 'marketplaces' | 'kits';

function getKey(key: StoreKey): string {
  return `${STORAGE_PREFIX}${key}`;
}

export function loadFromStore<T>(key: StoreKey): T | null {
  try {
    const raw = localStorage.getItem(getKey(key));
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function saveToStore<T>(key: StoreKey, data: T): void {
  try {
    localStorage.setItem(getKey(key), JSON.stringify(data));
  } catch (e) {
    console.warn(`Failed to save ${key} to localStorage:`, e);
  }
}

export function removeFromStore(key: StoreKey): void {
  localStorage.removeItem(getKey(key));
}

export function clearAllStore(): void {
  (Object.keys(localStorage) as string[])
    .filter((k) => k.startsWith(STORAGE_PREFIX))
    .forEach((k) => localStorage.removeItem(k));
}

export function exportAllData(): string {
  const data: Record<string, any> = {};
  (Object.keys(localStorage) as string[])
    .filter((k) => k.startsWith(STORAGE_PREFIX))
    .forEach((k) => {
      try {
        data[k] = JSON.parse(localStorage.getItem(k) || '{}');
      } catch {
        data[k] = localStorage.getItem(k);
      }
    });
  return JSON.stringify(data, null, 2);
}

export function importData(jsonString: string): boolean {
  try {
    const data = JSON.parse(jsonString);
    Object.entries(data).forEach(([key, value]) => {
      if (key.startsWith(STORAGE_PREFIX)) {
        localStorage.setItem(key, JSON.stringify(value));
      }
    });
    return true;
  } catch {
    return false;
  }
}
