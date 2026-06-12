import { useEffect, useState, useMemo, type RefObject, memo } from 'react';
import { Menu, Bell, Settings, X, BellOff } from 'lucide-react';
import { useLanguage } from '@context/LanguageContext';
import { useDataSourceVersion } from '@api/dataSourceContext';
import type { ViewType } from '@app-types';
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
  onNavigate?: (view: ViewType) => void;
}

const TYPE_STYLES: Record<string, string> = {
  success: 'border-l-2 border-l-success',
  warning: 'border-l-2 border-l-warning',
  error: 'border-l-2 border-l-danger',
  info: 'border-l-2 border-l-accent',
};

function TopBarComponent({
  isMobile,
  sidebarOpen,
  developerMode,
  notificationsOpen,
  dropdownRef,
  onOpenMobileSidebar,
  onToggleNotifications,
  onCloseNotifications,
  onOpenSettings,
  onNavigate,
}: TopBarProps) {
  const { language, setLanguage, t, formatShortDate } = useLanguage();
  const { ds, version } = useDataSourceVersion('notifications');
  const notifications = useMemo(() => ds.notifications, [ds, version]);
  const notifList = useMemo(() => ds.notifications.list, [ds, version]);
  const unreadCount = useMemo(() => ds.notifications.unreadCount, [ds, version]);
  const [sessionUnreadIds, setSessionUnreadIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!notificationsOpen) return;
    const ids = new Set(notifList.filter((n) => n.unread).map((n) => n.id));
    setSessionUnreadIds(ids);
    // Откладываем markAllRead на следующий фрейм, чтобы dropdown отрисовался
    // и не было визуального подёргивания из-за двойного рендера.
    const raf = requestAnimationFrame(() => {
      notifications.markAllRead();
    });
    return () => cancelAnimationFrame(raf);
  }, [notificationsOpen, notifications, notifList]);

  const timeAgo = (iso: string): string => {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return t('topbar.time_ago.just_now');
    if (mins < 60) return t('topbar.time_ago.mins', { n: mins });
    const hours = Math.floor(mins / 60);
    if (hours < 24) return t('topbar.time_ago.hours', { n: hours });
    const days = Math.floor(hours / 24);
    if (days < 7) return t('topbar.time_ago.days', { n: days });
    return formatShortDate(iso);
  };

  const handleNotificationClick = (n: typeof notifList[number]) => {
    if (n.actionView && onNavigate) onNavigate(n.actionView as ViewType);
    onCloseNotifications();
  };

  const handleClearAll = () => {
    notifications.clear();
  };

  const handleRemove = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    notifications.remove(id);
  };

  return (
    <header
      className="border-b border-border-subtle flex items-center justify-between px-4 bg-bg-secondary/80 relative z-[100]"
      style={{ height: 72 }}
    >
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
        <DevModeBadge key="dev-mode-badge" active={developerMode} />
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
              notificationsOpen
                ? 'bg-bg-hover text-text-primary'
                : 'text-text-tertiary hover:bg-bg-hover hover:text-text-primary'
            }`}
            title={t('header.notifications')}
            aria-expanded={notificationsOpen}
            aria-controls="notifications-dropdown"
            aria-label={t('header.notifications')}
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && !notificationsOpen && (
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-danger rounded-full" />
            )}
          </button>

          <div
            id="notifications-dropdown"
            className={`t-dropdown absolute right-0 mt-2 w-80 max-w-[90vw] glass-strong rounded-xl shadow-xl border border-border-strong overflow-hidden ${
              notificationsOpen ? 'is-open' : ''
            }`}
            data-origin="top-right"
          >
            {notifList.length > 0 ? (
              <>
                <div className="p-3 border-b border-border-subtle flex items-center justify-between bg-bg-secondary">
                  <span className="text-xs font-medium text-text-primary tracking-tight">
                    {t('header.notifications')}
                  </span>
                  <span
                    className="text-[10px] text-accent font-medium cursor-pointer hover:underline"
                    onClick={(e) => { e.stopPropagation(); notifications.markAllRead(); setSessionUnreadIds(new Set()); }}
                  >
                    {t('header.notifications.mark_read')}
                  </span>
                </div>
                <div className="max-h-80 overflow-y-auto divide-y divide-border-subtle">
                  {notifList.slice(0, 3).map((n) => (
                    <div
                      key={n.id}
                      onClick={() => handleNotificationClick(n)}
                      className={`p-3 hover:bg-bg-hover transition-colors cursor-pointer ${sessionUnreadIds.has(n.id) ? (TYPE_STYLES[n.type] || '') : ''}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0 flex-1">
                          <p className={`text-xs font-medium truncate ${sessionUnreadIds.has(n.id) ? 'text-text-primary' : 'text-text-tertiary'}`}>{n.title}</p>
                        </div>
                        <button
                          onClick={(e) => handleRemove(e, n.id)}
                          className="min-h-[44px] min-w-[44px] -m-[10px] rounded hover:bg-bg-hover text-text-tertiary hover:text-text-primary flex items-center justify-center flex-shrink-0 cursor-pointer"
                          aria-label={t('common.cancel')}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                      {n.description && (
                        <p className={`text-[11px] mt-0.5 line-clamp-2 ${sessionUnreadIds.has(n.id) ? 'text-text-secondary' : 'text-text-tertiary/70'}`}>{n.description}</p>
                      )}
                      <span className="text-[9px] text-text-tertiary mt-1 block">{timeAgo(n.createdAt)}</span>
                    </div>
                  ))}
                </div>
                <div className="p-2 border-t border-border-subtle flex items-center justify-center bg-bg-secondary">
                  <button
                    onClick={handleClearAll}
                    className="text-xs flex items-center gap-1 cursor-pointer bg-danger/10 text-danger hover:bg-danger/20 px-2 py-1 rounded transition-colors"
                  >
                    <X className="w-3 h-3" />
                    {t('header.notifications.clear_all')}
                  </button>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 px-6 text-center">
                <BellOff className="w-8 h-8 text-text-tertiary/40 mb-3" />
                <p className="text-sm font-medium text-text-secondary">{t('header.notifications.empty_title')}</p>
                <p className="text-xs text-text-tertiary mt-1">{t('header.notifications.empty_desc')}</p>
              </div>
            )}
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

export const TopBar = memo(TopBarComponent);
