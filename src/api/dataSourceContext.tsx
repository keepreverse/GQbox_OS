// ─── React-контекст для DataSource ─────────────────────────────────────────
// Оборачивает app в провайдер, который:
// 1. Держит активный DataSource (demo или dev) в зависимости от
//    `devMode` из DevModeContext.
// 2. При смене mode — пересоздаёт DataSource и дёргает refresh().
// 3. Подписывается на изменения, чтобы форсить ре-рендер всех
//    компонентов, использующих useDataSource().
//
// Хук useDataSource() возвращает текущий DataSource.
// Хук useDataSourceStatus() возвращает только статус (isReady, error, mode)
// и подписывается на изменения, но только обновляется когда статус меняется.
// Это изолирует AppContent от мутаций данных (например, notifications.clear).

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { DataSource } from './dataSource';
import { createDemoDataSource } from './demoDataSource';
import { createDevDataSource } from './devDataSource';
import { useDevMode } from '@context/DevModeContext';

const DataSourceContext = createContext<DataSource | null>(null);

interface DataSourceStatus {
  isReady: boolean;
  error: string | null;
  mode: 'demo' | 'dev';
}

const DataSourceStatusContext = createContext<DataSourceStatus>({
  isReady: false,
  error: null,
  mode: 'demo',
});

/**
 * Provider: монтируется в корне приложения. Сам следит за переключателем
 * DEVELOPER MODE в DevModeContext и пересоздаёт DataSource при изменении.
 */
export function DataSourceProvider({ children }: { children: ReactNode }) {
  const { devMode } = useDevMode();

  // Создаём DataSource мемоизированно, пересоздаём только при смене mode.
  const dataSource = useMemo<DataSource>(() => {
    return devMode ? createDevDataSource() : createDemoDataSource();
  }, [devMode]);

  // Статус обновляется только когда isReady, error или mode меняются.
  const [status, setStatus] = useState<DataSourceStatus>(() => ({
    isReady: dataSource.isReady,
    error: dataSource.error,
    mode: dataSource.mode,
  }));

  useEffect(() => {
    const unsub = dataSource.subscribe(() => {
      setStatus((prev) => {
        const next: DataSourceStatus = {
          isReady: dataSource.isReady,
          error: dataSource.error,
          mode: dataSource.mode,
        };
        if (prev.isReady === next.isReady && prev.error === next.error && prev.mode === next.mode) {
          return prev;
        }
        return next;
      });
    });
    return unsub;
  }, [dataSource]);

  // При смене mode дёргаем refresh() — на новый DataSource нет данных.
  useEffect(() => {
    dataSource.refresh();
  }, [dataSource]);

  return (
    <DataSourceContext.Provider value={dataSource}>
      <DataSourceStatusContext.Provider value={status}>
        {children}
      </DataSourceStatusContext.Provider>
    </DataSourceContext.Provider>
  );
}

/**
 * Хук для фич: возвращает текущий активный DataSource.
 * Подписывается на изменения (мутации, refresh) → форсит ре-рендер.
 * Если `topic` указан, ре-рендерит только при уведомлениях с этим топиком
 * или при `notify('all')` / `notify()` без топика.
 */
export function useDataSource(topic?: string): DataSource {
  const ds = useContext(DataSourceContext);
  if (!ds) {
    throw new Error('useDataSource must be used inside <DataSourceProvider>');
  }
  const [, forceRender] = useState(0);
  useEffect(() => {
    const unsub = ds.subscribe((t) => {
      if (!topic || !t || t === topic || t === 'all') {
        forceRender((n) => n + 1);
      }
    });
    return unsub;
  }, [ds, topic]);
  return ds;
}

/**
 * Хук для фич: возвращает стабильную версию данных (монотонно растущий
 * счётчик), которая инкрементируется ровно тогда, когда `notify(topic)`
 * реально доставляет обновление. Используется для стабилизации ссылок
 * `useMemo` на данные из DataSource, которые пересоздаются на каждый
 * getter-вызов (например, `productsApi.list`).
 *
 * Возвращает `{ ds, version }` — `version` увеличивается при `notify(topic)`.
 */
export function useDataSourceVersion(topic?: string): { ds: DataSource; version: number } {
  const ds = useContext(DataSourceContext);
  if (!ds) {
    throw new Error('useDataSourceVersion must be used inside <DataSourceProvider>');
  }
  const [version, setVersion] = useState(0);
  useEffect(() => {
    const unsub = ds.subscribe((t) => {
      if (!topic || !t || t === topic || t === 'all') {
        setVersion((n) => n + 1);
      }
    });
    return unsub;
  }, [ds, topic]);
  return { ds, version };
}

/**
 * Хук для вызовов API без подписки на изменения.
 * Не ре-рендерит компонент при мутациях данных.
 */
export function useDataSourceAPI(): DataSource {
  const ds = useContext(DataSourceContext);
  if (!ds) {
    throw new Error('useDataSourceAPI must be used inside <DataSourceProvider>');
  }
  return ds;
}

/**
 * Хук для корневых компонентов (AppContent): возвращает только статус.
 * Не ре-рендерит при мутациях данных (например, notifications.clear).
 */
export function useDataSourceStatus(): DataSourceStatus {
  return useContext(DataSourceStatusContext);
}
