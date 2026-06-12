import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

const STORAGE_KEY = 'gqbox_dev_mode';

function readInitial(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

interface DevModeContextValue {
  devMode: boolean;
  setDevMode: (next: boolean) => void;
}

const DevModeContext = createContext<DevModeContextValue | null>(null);

export function DevModeProvider({ children }: { children: ReactNode }) {
  const [devMode, setDevModeState] = useState<boolean>(readInitial);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, String(devMode));
    } catch {
      /* ignore quota / private mode */
    }
  }, [devMode]);

  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === STORAGE_KEY) {
        setDevModeState(e.newValue === 'true');
      }
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const setDevMode = useCallback((next: boolean) => {
    setDevModeState(next);
  }, []);

  const value = useMemo<DevModeContextValue>(
    () => ({ devMode, setDevMode }),
    [devMode, setDevMode]
  );

  return <DevModeContext.Provider value={value}>{children}</DevModeContext.Provider>;
}

export function useDevMode(): DevModeContextValue {
  const ctx = useContext(DevModeContext);
  if (!ctx) {
    throw new Error('useDevMode must be used inside <DevModeProvider>');
  }
  return ctx;
}
