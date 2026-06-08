// ─── React-контекст для DataSource ─────────────────────────────────────────
// Оборачивает app в провайдер, который:
// 1. Держит активный DataSource (demo или dev) в зависимости от
//    флага developerMode.
// 2. При смене mode — пересоздаёт DataSource и дёргает refresh().
// 3. Подписывается на изменения, чтобы форсить ре-рендер всех
//    компонентов, использующих useDataSource().
//
// Хук useDataSource() возвращает текущий DataSource.

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { DataSource } from './dataSource';
import { createDemoDataSource } from './demoDataSource';
import { createDevDataSource } from './devDataSource';

const DataSourceContext = createContext<DataSource | null>(null);

const STORAGE_KEY = 'gqbox_dev_mode';

function readDevMode(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

/**
 * Provider: монтируется в корне приложения. Сам следит за переключателем
 * DEVELOPER MODE в localStorage и пересоздаёт DataSource при изменении.
 */
export function DataSourceProvider({ children }: { children: ReactNode }) {
  const [devMode, setDevMode] = useState<boolean>(() => readDevMode());

  // Слушаем storage-события, чтобы переключаться в другой вкладке.
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === STORAGE_KEY) {
        setDevMode(readDevMode());
      }
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // Создаём DataSource мемоизированно, пересоздаём только при смене mode.
  const dataSource = useMemo<DataSource>(() => {
    return devMode ? createDevDataSource() : createDemoDataSource();
  }, [devMode]);

  // При смене mode дёргаем refresh() — на новый DataSource нет данных.
  useEffect(() => {
    dataSource.refresh();
  }, [dataSource]);

  return (
    <DataSourceContext.Provider value={dataSource}>
      {children}
    </DataSourceContext.Provider>
  );
}

/**
 * Хук для фич: возвращает текущий активный DataSource.
 * Подписывается на изменения (мутации, refresh) → форсит ре-рендер.
 */
export function useDataSource(): DataSource {
  const ds = useContext(DataSourceContext);
  if (!ds) {
    throw new Error('useDataSource must be used inside <DataSourceProvider>');
  }
  const [, forceRender] = useState(0);
  useEffect(() => {
    const unsub = ds.subscribe(() => forceRender((n) => n + 1));
    return unsub;
  }, [ds]);
  return ds;
}
