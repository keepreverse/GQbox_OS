import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ViewType } from '@app-types';
import { MOBILE_BREAKPOINT_PX } from '@constants/breakpoints';
import { LayoutProvider } from '@context/LayoutContext';
import { useMediaQuery } from '@hooks/useMediaQuery';
import { useClickOutside } from '@hooks/useClickOutside';
import { useEscapeKey } from '@hooks/useEscapeKey';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import SettingsPanel from './SettingsPanel';

interface LayoutProps {
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
  children: React.ReactNode;
}

export default function Layout({ currentView, onViewChange, children }: LayoutProps) {
  const [isMobile, setIsMobile] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [developerMode, setDeveloperMode] = useState<boolean>(() => {
    try {
      const val = localStorage.getItem('gqbox_dev_mode');
      if (val === null) return true;
      return val === 'true';
    } catch { return true; }
  });

  useEffect(() => {
    try { localStorage.setItem('gqbox_dev_mode', String(developerMode)); } catch {}
  }, [developerMode]);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLElement>(null);

  const scrollResetRef = (el: HTMLDivElement | null) => {
    if (el && mainRef.current) {
      mainRef.current.scrollTop = 0;
    }
  };

  useClickOutside(
    dropdownRef,
    useCallback(() => setNotificationsOpen(false), []),
    notificationsOpen,
  );

  useEscapeKey(
    useCallback(() => {
      if (notificationsOpen) setNotificationsOpen(false);
      if (settingsOpen) setSettingsOpen(false);
    }, [notificationsOpen, settingsOpen]),
  );

  const isMobileMedia = useMediaQuery(`(max-width: ${MOBILE_BREAKPOINT_PX - 1}px)`);

  useEffect(() => {
    setIsMobile(isMobileMedia);
    if (isMobileMedia) {
      setSidebarOpen(false);
      setSidebarCollapsed(false);
    } else {
      setSidebarOpen(true);
    }
  }, [isMobileMedia]);

  const handleNavigate = useCallback((view: ViewType) => {
    onViewChange(view);
    if (isMobile) setSidebarOpen(false);
  }, [onViewChange, isMobile]);

  const handleCollapse = useCallback(() => {
    if (isMobile) setSidebarOpen(false);
    else setSidebarCollapsed(true);
  }, [isMobile]);

  const handleExpand = useCallback(() => {
    setSidebarCollapsed(false);
  }, []);

  const handleOpenMobileSidebar = useCallback(() => {
    setSidebarOpen(true);
  }, []);

  const handleToggleNotifications = useCallback(() => {
    setNotificationsOpen(prev => !prev);
  }, []);

  const handleCloseNotifications = useCallback(() => {
    setNotificationsOpen(false);
  }, []);

  const handleOpenSettings = useCallback(() => {
    setSettingsOpen(true);
  }, []);

  const sidebarWidth = isMobile ? 244 : sidebarCollapsed ? 72 : 244;
  const headerHeight = 72;

  const layoutCtx = useMemo(() => ({
    sidebarWidth: isMobile ? 0 : sidebarWidth,
    headerHeight,
    isMobile,
    sidebarCollapsed,
  }), [sidebarWidth, isMobile, sidebarCollapsed]);

  return (
    <LayoutProvider value={layoutCtx}>
      <div className="flex h-[100dvh] overflow-hidden bg-bg-primary text-text-primary noise-overlay">
        <AnimatePresence>
          {isMobile && sidebarOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm cursor-pointer"
            />
          )}
        </AnimatePresence>

        <Sidebar
          isMobile={isMobile}
          sidebarOpen={sidebarOpen}
          sidebarCollapsed={sidebarCollapsed}
          sidebarWidth={sidebarWidth}
          currentView={currentView}
          onNavigate={handleNavigate}
          onCollapse={handleCollapse}
          onExpand={handleExpand}
          onOpenSettings={handleOpenSettings}
        />

        <div className="flex flex-col flex-1 min-w-0">
          <TopBar
            isMobile={isMobile}
            sidebarOpen={sidebarOpen}
            developerMode={developerMode}
            notificationsOpen={notificationsOpen}
            dropdownRef={dropdownRef}
            onOpenMobileSidebar={handleOpenMobileSidebar}
            onToggleNotifications={handleToggleNotifications}
            onCloseNotifications={handleCloseNotifications}
            onOpenSettings={handleOpenSettings}
          />

          <main ref={mainRef} id="main-content" className="flex-1 overflow-y-auto overflow-x-hidden grid-pattern relative">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentView}
                ref={scrollResetRef}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.12 }}
                className="p-3 sm:p-6 max-w-[1600px] mx-auto flex flex-col min-h-0"
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>

        <SettingsPanel
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
          developerMode={developerMode}
          onDeveloperModeChange={setDeveloperMode}
        />
      </div>
    </LayoutProvider>
  );
}
