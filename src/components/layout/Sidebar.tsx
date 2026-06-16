import { useEffect, useState, memo } from 'react';
import {
  LayoutDashboard,
  Cpu,
  Grid3X3,
  Wrench,
  BookOpen,
  Package,
  Image,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Settings,
  Database,
  Users,
  Shield,
} from 'lucide-react';
import type { ViewType } from '@app-types';
import { useLanguage } from '@context/LanguageContext';
import { useAuth } from '@context/AuthContext';
import { useDevMode } from '@context/DevModeContext';
import { useDataSourceAPI } from '@api/dataSourceContext';

interface SidebarProps {
  isMobile: boolean;
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
  sidebarWidth: number;
  currentView: ViewType;
  onNavigate: (view: ViewType) => void;
  onCollapse: () => void;
  onExpand: () => void;
  onOpenSettings: () => void;
}

function SidebarComponent({
  isMobile,
  sidebarOpen,
  sidebarCollapsed,
  sidebarWidth,
  currentView,
  onNavigate,
  onCollapse,
  onExpand,
  onOpenSettings,
}: SidebarProps) {
  const { t } = useLanguage();
  const { user, isAdmin } = useAuth();
  const { devMode } = useDevMode();
  const { inspector } = useDataSourceAPI();

  // Снимаем will-change после окончания анимации width/transform,
  // чтобы не держать лишний GPU-layer всё время.
  const [hintWillChange, setHintWillChange] = useState(true);
  useEffect(() => {
    setHintWillChange(true);
    const id = setTimeout(() => setHintWillChange(false), 350);
    return () => clearTimeout(id);
  }, [isMobile, sidebarOpen, sidebarCollapsed, sidebarWidth]);

  const navItems = [
    { id: 'dashboard' as ViewType, label: t('nav.dashboard'), icon: LayoutDashboard },
    { id: 'matrix' as ViewType, label: t('nav.matrix'), icon: Grid3X3 },
    { id: 'sku-constructor' as ViewType, label: t('nav.sku-constructor'), icon: Wrench },
    { id: 'dictionary' as ViewType, label: t('nav.dictionary'), icon: BookOpen },
    { id: 'kit-builder' as ViewType, label: t('nav.kit-builder'), icon: Package },
    { id: 'media' as ViewType, label: t('nav.media'), icon: Image },
    { id: 'ai-hub' as ViewType, label: t('nav.ai-hub'), icon: Sparkles, badge: t('nav.beta') },
    // Архитектура — справочный раздел для разработки: показываем только
    // администратору в режиме разработчика (по аналогии с DBInspector).
    ...(devMode && isAdmin
      ? [{ id: 'architecture' as ViewType, label: t('nav.architecture'), icon: Cpu }]
      : []),
    ...(devMode && isAdmin
      ? [{ id: 'administration' as ViewType, label: t('nav.administration'), icon: Users }]
      : []),
    ...(inspector.available && isAdmin
      ? [{ id: 'db-inspector' as ViewType, label: t('nav.db-inspector'), icon: Database }]
      : []),
  ];

  return (
    <aside
      className={`border-r border-border-subtle bg-bg-secondary flex flex-col overflow-hidden z-[102] flex-shrink-0 transition-[width,transform] duration-300 ease-in-out ${
        isMobile ? 'fixed top-0 bottom-0 left-0' : ''
      }`}
      style={{
        width: isMobile ? sidebarWidth : sidebarCollapsed ? 72 : 244,
        transform: isMobile ? (sidebarOpen ? 'translateX(0)' : 'translateX(-100%)') : 'none',
        pointerEvents: isMobile && !sidebarOpen ? 'none' : 'auto',
        willChange: hintWillChange ? (isMobile ? 'transform' : 'width') : 'auto',
      }}
    >
      <div
        className="flex-shrink-0 border-b border-border-subtle relative bg-bg-secondary overflow-hidden"
        style={{ height: 72 }}
      >
        {/* Статичный контейнер логотипа */}
        <div className="absolute top-[11px] w-[72px] flex justify-center z-10 pointer-events-none">
          <div className="relative flex items-center">
            {/* Якорь GQ */}
            <span className="text-[26px] font-bold text-text-primary leading-none select-none">
              GQ
            </span>
            
            {/* Box */}
            <span
              className={`absolute left-full top-0 ml-[2px] text-[26px] font-bold text-text-primary leading-none whitespace-nowrap select-none transition-opacity duration-150 ${
                sidebarCollapsed ? 'opacity-0' : 'opacity-100'
              }`}
            >
              box
            </span>

            {/* Подпись */}
            <div
              className={`absolute top-full left-0 pt-1 transition-opacity duration-150 ${
                sidebarCollapsed ? 'opacity-0' : 'opacity-100'
              }`}
            >
              <p className="text-[10px] text-text-secondary whitespace-nowrap font-light tracking-[0.1em] uppercase select-none">
                {t('sidebar.tagline')}
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={onCollapse}
          className={`absolute right-0 top-0 h-full w-11 sm:w-10 border-l border-border-subtle text-text-tertiary hover:text-text-primary hover:bg-bg-hover/50 flex items-center justify-center z-20 cursor-pointer bg-bg-secondary outline-none [-webkit-tap-highlight-color:transparent] transition-opacity duration-200 ${
            sidebarCollapsed ? 'opacity-0 pointer-events-none' : 'opacity-100'
          }`}
          title={t('layout.collapse_menu')}
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={onExpand}
          className={`absolute bottom-0 left-0 w-[72px] h-11 sm:h-6 text-text-tertiary hover:text-text-primary hover:bg-bg-hover/50 flex items-center justify-center z-20 cursor-pointer bg-bg-secondary outline-none [-webkit-tap-highlight-color:transparent] transition-all duration-200 ${
            sidebarCollapsed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5 pointer-events-none'
          }`}
          title={t('layout.expand_menu')}
        >
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-border-subtle" />
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto py-0" aria-label="Main navigation">
        {navItems.map((item) => {
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              aria-current={isActive ? 'page' : undefined}
              className={`w-full h-12 text-sm flex items-center pl-[24px] transition-colors border-b border-border-subtle/30 last:border-0 cursor-pointer overflow-hidden outline-none [-webkit-tap-highlight-color:transparent] ${
                isActive
                  ? 'bg-bg-tertiary text-accent border-l-2 border-l-accent'
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover border-l-2 border-l-transparent'
              }`}
              style={{ transform: 'translateZ(0)' }}
              title={sidebarCollapsed ? item.label : ''}
            >
              <item.icon
                className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-accent' : 'text-text-tertiary'}`}
              />
              <div
                className={`flex items-center shrink-0 w-[186px] ml-3 transition-opacity duration-150 ${
                  sidebarCollapsed ? 'opacity-0 pointer-events-none' : 'opacity-100'
                }`}
              >
                <span className="flex-1 text-left truncate select-none">{item.label}</span>
                {item.badge && (
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full flex-shrink-0 ml-3 mr-2 select-none font-medium tracking-wide border border-border-subtle ${
                      isActive
                        ? 'bg-accent/20 text-accent'
                        : 'bg-bg-elevated text-text-tertiary'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </nav>

      <div className="py-2 border-t border-border-subtle">
        <div className="h-11 bg-bg-tertiary flex items-center pl-[22px] overflow-hidden w-full">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-accent to-accent-hover flex items-center justify-center text-[10px] font-bold text-white shrink-0 ring-1 ring-accent/30 select-none">
            {user?.displayName?.slice(0, 2).toUpperCase() ?? 'GQ'}
          </div>
          <div
            className={`flex items-center justify-between shrink-0 w-[182px] ml-3 pr-2 transition-opacity duration-150 ${
              sidebarCollapsed ? 'opacity-0 pointer-events-none' : 'opacity-100'
            }`}
          >
            <div className="min-w-0 pr-2 select-none">
              <p className="text-xs font-medium truncate">{user?.displayName ?? 'GQbox'}</p>
              <p className="text-[10px] text-text-tertiary truncate flex items-center gap-1">
                {isAdmin ? (
                  <>
                    <Shield className="w-2.5 h-2.5 text-accent" /> {t('header.admin')}
                  </>
                ) : (
                  t('header.user')
                )}
              </p>
            </div>
            <button
              onClick={onOpenSettings}
              className="h-11 w-11 sm:h-9 sm:w-9 p-0 rounded-lg hover:bg-bg-hover hover:text-text-primary text-text-tertiary transition-colors shrink-0 cursor-pointer flex items-center justify-center outline-none [-webkit-tap-highlight-color:transparent]"
              title={t('header.settings')}
              aria-label={t('header.settings')}
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}

export const Sidebar = memo(SidebarComponent);
