import { useState, useEffect, useRef, useMemo, useCallback, memo } from 'react';
import type { ViewType } from '@app-types';
import { MOBILE_BREAKPOINT_PX } from '@constants/breakpoints';
import { LayoutProvider } from '@context/LayoutContext';
import { useDevMode } from '@context/DevModeContext';
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

/**
 * Изолируем AnimatePresence + motion.div в memo-компонент.
 * Рендерится только при смене currentView или children.
 * При открытии dropdown/настроек Layout рендерится, но этот компонент — нет.
 */
const ViewContent = memo(function ViewContent({
  currentView,
  children,
}: {
  currentView: ViewType;
  children: React.ReactNode;
}) {
  return (
    <div key={currentView} className="p-3 sm:p-6 max-w-[1600px] mx-auto flex flex-col min-h-0 animate-fade-in-fast">
      {children}
    </div>
  );
});

function LayoutComponent({ currentView, onViewChange, children }: LayoutProps) {
  // Initialize isMobile synchronously so the sidebar renders in the correct
  // state on the first paint — otherwise the expanded (desktop) sidebar
  // flashes for a frame on narrow viewports before snapping to collapsed.
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT_PX - 1}px)`).matches;
  });
  const [sidebarOpen, setSidebarOpen] = useState(() => !isMobile);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [overlayMounted, setOverlayMounted] = useState(false);
  const [overlayExiting, setOverlayExiting] = useState(false);
  const { devMode } = useDevMode();

  const dropdownRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLElement>(null);

  // Сбрасываем scroll при смене view
  useEffect(() => {
    if (mainRef.current) {
      mainRef.current.scrollTop = 0;
    }
  }, [currentView]);

  useClickOutside(
    dropdownRef,
    useCallback(() => setNotificationsOpen(false), []),
    notificationsOpen
  );

  useEscapeKey(
    useCallback(() => {
      if (notificationsOpen) setNotificationsOpen(false);
      if (settingsOpen) setSettingsOpen(false);
    }, [notificationsOpen, settingsOpen])
  );

  const isMobileMedia = useMediaQuery(`(max-width: ${MOBILE_BREAKPOINT_PX - 1}px)`);

  // Mobile sidebar overlay: fades in when the sidebar opens and starts fading
  // out immediately when the sidebar closes, matching the sidebar's 300ms
  // transition. The element stays mounted for the duration of the fade-out so
  // it does not unmount mid-animation.
  const showOverlay = isMobile && sidebarOpen;
  useEffect(() => {
    if (showOverlay) {
      setOverlayMounted(true);
      setOverlayExiting(false);
    } else {
      setOverlayExiting(true);
      const timer = setTimeout(() => setOverlayMounted(false), 300);
      return () => clearTimeout(timer);
    }
  }, [showOverlay]);

  useEffect(() => {
    setIsMobile(isMobileMedia);
    if (isMobileMedia) {
      setSidebarOpen(false);
      setSidebarCollapsed(false);
    } else {
      setSidebarOpen(true);
    }
  }, [isMobileMedia]);

  const handleNavigate = useCallback(
    (view: ViewType) => {
      onViewChange(view);
      if (isMobile) {
        setSidebarOpen(false);
      }
    },
    [onViewChange, isMobile]
  );

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
    setNotificationsOpen((prev) => !prev);
  }, []);

  const handleCloseNotifications = useCallback(() => {
    setNotificationsOpen(false);
  }, []);

  const handleOpenSettings = useCallback(() => {
    setSettingsOpen(true);
  }, []);

  const sidebarWidth = isMobile ? 244 : sidebarCollapsed ? 72 : 244;
  const headerHeight = 72;

  const layoutCtx = useMemo(
    () => ({
      sidebarWidth: isMobile ? 0 : sidebarWidth,
      headerHeight,
      isMobile,
      sidebarCollapsed,
    }),
    [sidebarWidth, isMobile, sidebarCollapsed]
  );

  return (
    <LayoutProvider value={layoutCtx}>
      <div className="flex h-[100dvh] overflow-hidden bg-bg-primary text-text-primary noise-overlay">
        {overlayMounted && (
          <div
            onClick={() => setSidebarOpen(false)}
            className={`fixed inset-0 bg-black/20 z-[101] cursor-pointer ${
              overlayExiting ? 'animate-overlay-out' : 'animate-overlay-in'
            }`}
          />
        )}

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
            developerMode={devMode}
            notificationsOpen={notificationsOpen}
            dropdownRef={dropdownRef}
            onOpenMobileSidebar={handleOpenMobileSidebar}
            onToggleNotifications={handleToggleNotifications}
            onCloseNotifications={handleCloseNotifications}
            onOpenSettings={handleOpenSettings}
            onNavigate={onViewChange}
          />

          <main
            ref={mainRef}
            id="main-content"
            className="flex-1 overflow-y-auto overflow-x-hidden grid-pattern relative"
          >
            <ViewContent currentView={currentView}>{children}</ViewContent>
          </main>
        </div>

        <SettingsPanel
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
        />
      </div>
    </LayoutProvider>
  );
}

export default memo(LayoutComponent);
