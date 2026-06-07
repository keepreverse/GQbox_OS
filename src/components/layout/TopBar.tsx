import type { RefObject } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Menu, Bell, Settings } from 'lucide-react';
import { useLanguage } from '@context/LanguageContext';
import DevModeBadge from './DevModeBadge';

interface TopBarProps {
  isMobile: boolean;
  sidebarOpen: boolean;
  developerMode: boolean;
  notificationsOpen: boolean;
  dropdownRef: RefObject<HTMLDivElement | null>;
  onOpenMobileSidebar: () => void;
  onToggleNotifications: () => void;
  onCloseNotifications: () => void;
  onOpenSettings: () => void;
}

export function TopBar({
  isMobile,
  sidebarOpen,
  developerMode,
  notificationsOpen,
  dropdownRef,
  onOpenMobileSidebar,
  onToggleNotifications,
  onCloseNotifications,
  onOpenSettings,
}: TopBarProps) {
  const { language, setLanguage, t } = useLanguage();

  const mockNotifications = [
    { id: 1, title: t('header.notifications.n1_title'), desc: t('header.notifications.n1_desc'), time: t('header.notifications.n1_time'), unread: true },
    { id: 2, title: t('header.notifications.n2_title'), desc: t('header.notifications.n2_desc'), time: t('header.notifications.n2_time'), unread: true },
    { id: 3, title: t('header.notifications.n3_title'), desc: t('header.notifications.n3_desc'), time: t('header.notifications.n3_time'), unread: false },
  ];

  return (
    <header className="border-b border-border-subtle flex items-center justify-between px-4 bg-bg-secondary/50 backdrop-blur-sm z-30" style={{ height: 72 }}>
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        {isMobile && !sidebarOpen && (
          <button
            onClick={onOpenMobileSidebar}
            className="h-9 w-9 p-0 rounded-lg hover:bg-bg-hover text-text-tertiary hover:text-text-primary transition-colors cursor-pointer flex items-center justify-center"
            title={t('layout.open_menu')}
            aria-label={t('layout.open_menu')}
          >
            <Menu className="w-4 h-4" />
          </button>
        )}
        <AnimatePresence>
          <DevModeBadge key="dev-mode-badge" active={developerMode} />
        </AnimatePresence>
      </div>

      <div className="flex items-center gap-2">
        <div className="max-[359px]:hidden flex items-center rounded-lg bg-bg-tertiary border border-border-subtle p-0.5 h-9">
          <button
            onClick={() => setLanguage('ru')}
            className={`h-full px-2.5 rounded text-xs font-medium transition-colors cursor-pointer ${
              language === 'ru'
                ? 'bg-bg-elevated text-text-primary'
                : 'text-text-tertiary hover:bg-bg-hover hover:text-text-primary'
            }`}
            title={t('header.settings.russian')}
            aria-label={t('header.settings.russian')}
          >
            RU
          </button>
          <button
            onClick={() => setLanguage('en')}
            className={`h-full px-2.5 rounded text-xs font-medium transition-colors cursor-pointer ${
              language === 'en'
                ? 'bg-bg-elevated text-text-primary'
                : 'text-text-tertiary hover:bg-bg-hover hover:text-text-primary'
            }`}
            title={t('header.settings.english')}
            aria-label={t('header.settings.english')}
          >
            EN
          </button>
        </div>

        <div className="relative" ref={dropdownRef}>
          <button
            onClick={onToggleNotifications}
            className={`h-9 w-9 p-0 rounded-lg transition-colors cursor-pointer flex items-center justify-center ${
              notificationsOpen ? 'bg-bg-hover text-text-primary' : 'text-text-tertiary hover:bg-bg-hover hover:text-text-primary'
            }`}
            title={t('header.notifications')}
            aria-expanded={notificationsOpen}
            aria-label={t('header.notifications')}
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-danger rounded-full" />
          </button>

          <div
            className={`t-dropdown absolute right-0 mt-2 w-80 max-w-[90vw] glass-strong rounded-xl shadow-xl border border-border-strong overflow-hidden z-50 ${
              notificationsOpen ? 'is-open' : ''
            }`}
            data-origin="top-right"
          >
            <div className="p-3 border-b border-border-subtle flex items-center justify-between bg-bg-secondary">
              <span className="text-xs font-medium text-text-primary tracking-tight">{t('header.notifications')}</span>
              <span className="text-[10px] text-accent font-medium cursor-pointer hover:underline">{t('header.notifications.mark_read')}</span>
            </div>
            <div className="max-h-80 overflow-y-auto divide-y divide-border-subtle">
              {mockNotifications.map((n) => (
                <div key={n.id} className={`p-3 hover:bg-bg-hover transition-colors cursor-pointer ${n.unread ? 'bg-accent/5' : ''}`}>
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs font-medium text-text-primary">{n.title}</p>
                    {n.unread && <span className="w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0 mt-1" />}
                  </div>
                  <p className="text-[11px] text-text-secondary mt-0.5">{n.desc}</p>
                  <span className="text-[9px] text-text-tertiary mt-1 block">{n.time}</span>
                </div>
              ))}
            </div>
            <div className="p-2 border-t border-border-subtle text-center bg-bg-secondary">
              <button
                onClick={onCloseNotifications}
                className="text-[11px] text-text-tertiary hover:bg-bg-hover hover:text-text-primary transition-colors cursor-pointer"
              >
                {t('header.notifications.close')}
              </button>
            </div>
          </div>
        </div>

        <button
          onClick={onOpenSettings}
          className="h-9 w-9 p-0 rounded-lg text-text-tertiary hover:bg-bg-hover hover:text-text-primary transition-colors cursor-pointer flex items-center justify-center"
          title={t('header.settings')}
          aria-label={t('header.settings')}
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
