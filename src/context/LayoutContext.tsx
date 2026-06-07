import { createContext, useContext, ReactNode } from 'react';

export interface LayoutContextType {
  sidebarWidth: number;
  headerHeight: number;
  isMobile: boolean;
  sidebarCollapsed: boolean;
}

const LayoutContext = createContext<LayoutContextType | undefined>(undefined);

export function useLayout() {
  const context = useContext(LayoutContext);
  if (!context) {
    return { sidebarWidth: 0, headerHeight: 0, isMobile: false, sidebarCollapsed: false };
  }
  return context;
}

interface LayoutProviderProps {
  value: LayoutContextType;
  children: ReactNode;
}

export function LayoutProvider({ value, children }: LayoutProviderProps) {
  return <LayoutContext.Provider value={value}>{children}</LayoutContext.Provider>;
}
