// ─── localStorage-обёртка с поддержкой mode ────────────────────────────────
// Ключи разложены по mode: `gqbox_demo_*` и `gqbox_dev_*`. Это изолирует
// данные разных режимов, чтобы при переключении DEVELOPER MODE ничего
// не пересекалось.

export type StoreMode = 'demo' | 'dev';

const PREFIX_BY_MODE: Record<StoreMode, string> = {
  demo: 'gqbox_demo_',
  dev: 'gqbox_dev_',
};

// ─── Одноразовая миграция со старого префикса `gqbox_` на `gqbox_demo_` ────
let migrated = false;
function migrateLegacyKeysOnce(): void {
  if (migrated) return;
  migrated = true;
  try {
    const legacyPrefix = 'gqbox_';
    const newPrefix = PREFIX_BY_MODE.demo;
    const moved: string[] = [];
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (!k) continue;
      // Пропускаем системные ключи GQbox (gqbox_dev_mode, gqbox_view) —
      // они НЕ мигрируют, остаются как есть.
      if (k === 'gqbox_dev_mode' || k === 'gqbox_view') continue;
      // Пропускаем уже мигрированные ключи.
      if (k.startsWith(newPrefix)) continue;
      // Пропускаем ключи, которые не относятся к старому префиксу.
      if (!k.startsWith(legacyPrefix)) continue;
      // Пропускаем ключи, в которых "gqbox_" — это лишь подстрока (например, "gqbox_2fa_secret").
      const suffix = k.slice(legacyPrefix.length);
      if (!suffix || suffix.includes('_')) continue;
      const value = localStorage.getItem(k);
      if (value !== null) {
        localStorage.setItem(newPrefix + suffix, value);
        moved.push(k);
      }
    }
    // Удаляем старые ключи ПОСЛЕ переноса, чтобы не потерять данные.
    for (const k of moved) localStorage.removeItem(k);
    if (moved.length > 0) {
      console.info(`[store] Migrated ${moved.length} legacy keys to ${newPrefix}`);
    }
  } catch (e) {
    console.warn('[store] Migration failed:', e);
  }
}

export type StoreKey = 'products' | 'dictionaries' | 'marketplaces' | 'kits';

function getKey(mode: StoreMode, key: StoreKey): string {
  return `${PREFIX_BY_MODE[mode]}${key}`;
}

export function loadFromStore<T>(mode: StoreMode, key: StoreKey): T | null {
  if (mode === 'demo') migrateLegacyKeysOnce();
  try {
    const raw = localStorage.getItem(getKey(mode, key));
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function saveToStore<T>(mode: StoreMode, key: StoreKey, data: T): void {
  try {
    localStorage.setItem(getKey(mode, key), JSON.stringify(data));
  } catch (e) {
    console.warn(`Failed to save ${key} to localStorage:`, e);
  }
}

export function removeFromStore(mode: StoreMode, key: StoreKey): void {
  try {
    localStorage.removeItem(getKey(mode, key));
  } catch {
    /* ignore */
  }
}

export function clearAllStore(mode: StoreMode): void {
  try {
    const prefix = PREFIX_BY_MODE[mode];
    const toRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(prefix)) toRemove.push(k);
    }
    for (const k of toRemove) localStorage.removeItem(k);
  } catch {
    /* ignore */
  }
}

export function exportAllData(): string {
  const data: Record<string, any> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (!k || !k.startsWith('gqbox_')) continue;
    try {
      data[k] = JSON.parse(localStorage.getItem(k) || '{}');
    } catch {
      data[k] = localStorage.getItem(k);
    }
  }
  return JSON.stringify(data, null, 2);
}

export function importData(jsonString: string): boolean {
  try {
    const data = JSON.parse(jsonString);
    Object.entries(data).forEach(([key, value]) => {
      if (key.startsWith('gqbox_')) {
        localStorage.setItem(key, JSON.stringify(value));
      }
    });
    return true;
  } catch {
    return false;
  }
}
