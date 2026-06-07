import { motion } from 'framer-motion';
import {
  LayoutDashboard, Cpu, Grid3X3, Wrench, BookOpen, Package, Image,
  Sparkles, ChevronLeft, ChevronRight, Settings,
} from 'lucide-react';
import type { ViewType } from '@app-types';
import { useLanguage } from '@context/LanguageContext';

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

export function Sidebar({
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

  const navItems = [
    { id: 'dashboard' as ViewType, label: t('nav.dashboard'), icon: LayoutDashboard },
    { id: 'matrix' as ViewType, label: t('nav.matrix'), icon: Grid3X3 },
    { id: 'sku-constructor' as ViewType, label: t('nav.sku-constructor'), icon: Wrench },
    { id: 'dictionary' as ViewType, label: t('nav.dictionary'), icon: BookOpen },
    { id: 'kit-builder' as ViewType, label: t('nav.kit-builder'), icon: Package },
    { id: 'media' as ViewType, label: t('nav.media'), icon: Image },
    { id: 'architecture' as ViewType, label: t('nav.architecture'), icon: Cpu },
    { id: 'ai-hub' as ViewType, label: t('nav.ai-hub'), icon: Sparkles, badge: t('nav.beta') },
  ];

  return (
    <aside
      className={`border-r border-border-subtle bg-bg-secondary flex flex-col overflow-hidden z-50 flex-shrink-0 transition-[width] duration-150 ease-out ${
        isMobile ? 'fixed top-0 bottom-0 left-0' : ''
      }`}
      style={{
        width: isMobile ? (sidebarOpen ? sidebarWidth : 0) : (sidebarCollapsed ? 72 : 244),
        transform: isMobile
          ? (sidebarOpen ? 'translateX(0)' : 'translateX(-100%)')
          : 'none',
      }}
    >
      <div className="flex-shrink-0 border-b border-border-subtle relative flex flex-col" style={{ height: 72 }}>
        <div className="flex items-center pl-[16px] pt-2">
          <span className="text-[26px] font-bold text-text-primary leading-none">GQ</span>
          <motion.span
            initial={false}
            animate={{ maxWidth: sidebarCollapsed ? 0 : 88, opacity: sidebarCollapsed ? 0 : 1, marginLeft: sidebarCollapsed ? 0 : 2 }}
            transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
            className="text-[28px] font-bold text-text-primary leading-none overflow-hidden whitespace-nowrap inline-block"
          >
            box
          </motion.span>
        </div>

        <motion.div
          initial={false}
          animate={{ opacity: sidebarCollapsed ? 0 : 1, height: sidebarCollapsed ? 0 : 'auto' }}
          transition={{ duration: 0.15 }}
          className="overflow-hidden w-full pl-[16px] mt-1 mb-4"
        >
          <p className="text-[10px] text-text-secondary whitespace-nowrap font-light tracking-[0.1em] uppercase">
            {t('sidebar.tagline')}
          </p>
        </motion.div>

        <motion.button
          initial={false}
          animate={{ opacity: sidebarCollapsed ? 0 : 1, x: sidebarCollapsed ? 20 : 0 }}
          transition={{ duration: 0.15 }}
          onClick={onCollapse}
          className="absolute right-0 top-0 h-full w-11 sm:w-10 border-l border-border-subtle text-text-tertiary hover:text-text-primary hover:bg-bg-hover/50 transition-colors flex items-center justify-center bg-transparent pointer-events-auto cursor-pointer"
          style={{ pointerEvents: sidebarCollapsed ? 'none' : 'auto' }}
          title={t('layout.collapse_menu')}
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </motion.button>

        <motion.button
          initial={false}
          animate={{ opacity: sidebarCollapsed ? 1 : 0, y: sidebarCollapsed ? 0 : 20 }}
          transition={{ duration: 0.15 }}
          onClick={onExpand}
          className="absolute bottom-0 left-0 w-[72px] h-11 sm:h-6 border-t border-border-subtle text-text-tertiary hover:text-text-primary hover:bg-bg-hover/50 transition-colors flex items-center justify-center bg-transparent pointer-events-auto cursor-pointer"
          style={{ pointerEvents: sidebarCollapsed ? 'auto' : 'none' }}
          title={t('layout.expand_menu')}
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </motion.button>
      </div>

      <nav className="flex-1 overflow-y-auto py-0">
        {navItems.map((item) => {
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full h-12 text-sm flex items-center pl-[26px] pr-2 transition-colors border-b border-border-subtle/30 last:border-0 cursor-pointer ${
                isActive
                  ? 'bg-bg-tertiary text-accent border-l-2 border-l-accent'
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover border-l-2 border-l-transparent'
              }`}
              style={{ transform: 'translateZ(0)' }}
              title={sidebarCollapsed ? item.label : ''}
            >
              <item.icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-accent' : 'text-text-tertiary'}`} />
              <span className={`flex-1 text-left truncate ml-3 transition-opacity duration-150 ${sidebarCollapsed ? 'opacity-0 w-0 overflow-hidden ml-0' : 'opacity-100 ml-3'}`}>
                {item.label}
              </span>
              {!sidebarCollapsed && item.badge && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded flex-shrink-0 ${isActive ? 'bg-accent/20 text-accent' : 'bg-bg-elevated text-text-tertiary'}`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="py-2 border-t border-border-subtle">
        <div className="h-11 bg-bg-tertiary flex items-center pl-[22px] pr-2 overflow-hidden">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-accent to-accent-hover flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0 ring-1 ring-accent/30">
            GQ
          </div>
          <motion.div
            initial={false}
            animate={{ opacity: sidebarCollapsed ? 0 : 1, maxWidth: sidebarCollapsed ? 0 : 170, marginLeft: sidebarCollapsed ? 0 : 12 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden flex items-center justify-between flex-1"
          >
            <div className="min-w-0 pr-2">
              <p className="text-xs font-medium truncate">{t('header.team')}</p>
              <p className="text-[10px] text-text-tertiary truncate">{t('header.admin')}</p>
            </div>
            <button
              onClick={onOpenSettings}
              className="h-11 w-11 sm:h-9 sm:w-9 p-0 rounded-lg hover:bg-bg-hover hover:text-text-primary text-text-tertiary transition-colors flex-shrink-0 cursor-pointer flex items-center justify-center"
              title={t('header.settings')}
              aria-label={t('header.settings')}
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        </div>
      </div>
    </aside>
  );
}
