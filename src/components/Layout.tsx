import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Cpu, Grid3X3, Wrench, BookOpen, Package, Image,
  Sparkles, Menu, X, Bell, Settings, Globe, Shield, Key, LogOut,
  ChevronLeft, ChevronRight,
} from 'lucide-react';
import type { ViewType } from '../data/types';
import { useLanguage } from '../context/LanguageContext';
import type { Language } from '../context/LanguageContext';
import { LayoutProvider } from '../context/LayoutContext';
import BottomSheet from './BottomSheet';

const MODAL_CLOSE_MS = 150;

interface LayoutProps {
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
  children: React.ReactNode;
}

export default function Layout({ currentView, onViewChange, children }: LayoutProps) {
  const { language, setLanguage, t } = useLanguage();
  const [isMobile, setIsMobile] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsClosing, setSettingsClosing] = useState(false);
  const savedLangRef = useRef<Language>(language);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLElement>(null);

  const scrollResetRef = (el: HTMLDivElement | null) => {
    if (el && mainRef.current) {
      mainRef.current.scrollTop = 0;
    }
  };

  // Close dropdown on outside click
  useEffect(() => {
    if (!notificationsOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setNotificationsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [notificationsOpen]);

  // Close dropdown on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (notificationsOpen) setNotificationsOpen(false);
        if (settingsOpen) closeSettings();
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [notificationsOpen, settingsOpen]);

  const closeSettings = useCallback(() => {
    setSettingsClosing(true);
    setLanguage(savedLangRef.current);
    setTimeout(() => {
      setSettingsOpen(false);
      setSettingsClosing(false);
    }, MODAL_CLOSE_MS);
  }, [setLanguage]);

  const saveSettings = useCallback(() => {
    setSettingsClosing(true);
    setTimeout(() => {
      setSettingsOpen(false);
      setSettingsClosing(false);
    }, MODAL_CLOSE_MS);
  }, []);

  const openSettings = useCallback(() => {
    setSettingsClosing(false);
    setSettingsOpen(true);
    savedLangRef.current = language;
  }, [language]);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (mobile) {
        setSidebarOpen(false);
        setSidebarCollapsed(false);
      } else {
        setSidebarOpen(true);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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

  const mockNotifications = [
    { id: 1, title: t('header.notifications.n1_title'), desc: t('header.notifications.n1_desc'), time: t('header.notifications.n1_time'), unread: true },
    { id: 2, title: t('header.notifications.n2_title'), desc: t('header.notifications.n2_desc'), time: t('header.notifications.n2_time'), unread: true },
    { id: 3, title: t('header.notifications.n3_title'), desc: t('header.notifications.n3_desc'), time: t('header.notifications.n3_time'), unread: false },
  ];

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
        {/* Шапка сайдбара — анимация логотипа и кнопок */}
        <div className="flex-shrink-0 border-b border-border-subtle relative flex flex-col" style={{ height: 72 }}>
          {/* Логотип GQ (статичный по X, смещен левее) */}
          <div className="flex items-center pl-[16px] pt-2">
            <span className="text-[26px] font-bold text-text-primary leading-none">GQ</span>
            <motion.span
              initial={false}
              animate={{ maxWidth: sidebarCollapsed ? 0 : 88, opacity: sidebarCollapsed ? 0 : 1, marginLeft: sidebarCollapsed ? 0 : 2 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="text-[28px] font-bold text-text-primary leading-none overflow-hidden whitespace-nowrap inline-block"
            >
              box
            </motion.span>
          </div>

          {/* Подпись (плавное появление, увеличен отступ сверху) */}
          <motion.div
            initial={false}
            animate={{ opacity: sidebarCollapsed ? 0 : 1, height: sidebarCollapsed ? 0 : 'auto' }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden w-full pl-[16px] mt-1 mb-4"
          >
            <p className="text-[10px] text-text-secondary whitespace-nowrap font-light tracking-[0.1em] uppercase">
              {t('sidebar.tagline')}
            </p>
          </motion.div>

          {/* Кнопка сворачивания (Вертикальная, справа) */}
          <motion.button
            initial={false}
            animate={{ opacity: sidebarCollapsed ? 0 : 1, x: sidebarCollapsed ? 20 : 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => {
              if (isMobile) setSidebarOpen(false);
              else setSidebarCollapsed(true);
            }}
            className="absolute right-0 top-0 h-full w-11 sm:w-10 border-l border-border-subtle text-text-tertiary hover:text-text-primary hover:bg-bg-hover/50 transition-colors flex items-center justify-center bg-transparent pointer-events-auto cursor-pointer"
            style={{ pointerEvents: sidebarCollapsed ? 'none' : 'auto' }}
            title={t('layout.collapse_menu')}
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </motion.button>

          {/* Кнопка разворачивания (слева, всегда в видимой области) */}
          <motion.button
            initial={false}
            animate={{ opacity: sidebarCollapsed ? 1 : 0, y: sidebarCollapsed ? 0 : 20 }}
            transition={{ duration: 0.2 }}
            onClick={() => setSidebarCollapsed(false)}
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
                onClick={() => {
                  onViewChange(item.id);
                  if (isMobile) setSidebarOpen(false);
                }}
                className={`w-full h-12 text-sm flex items-center pl-[26px] pr-2 transition-colors border-b border-border-subtle/30 last:border-0 cursor-pointer ${
                  isActive
                    ? 'bg-bg-tertiary text-accent border-l-2 border-l-accent'
                    : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover border-l-2 border-l-transparent'
                }`}
                style={{ transform: 'translateZ(0)' }}
                title={sidebarCollapsed ? item.label : ''}
              >
                <item.icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-accent' : 'text-text-tertiary'}`} />
                <span className={`flex-1 text-left truncate ml-3 transition-opacity duration-200 ${sidebarCollapsed ? 'opacity-0 w-0 overflow-hidden ml-0' : 'opacity-100 ml-3'}`}>
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
              transition={{ duration: 0.2 }}
              className="overflow-hidden flex items-center justify-between flex-1"
            >
              <div className="min-w-0 pr-2">
                <p className="text-xs font-medium truncate">{t('header.team')}</p>
                <p className="text-[10px] text-text-tertiary truncate">{t('header.admin')}</p>
              </div>
              <button
                onClick={openSettings}
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

      <div className="flex flex-col flex-1 min-w-0">
        <header className="border-b border-border-subtle flex items-center justify-between px-4 bg-bg-secondary/50 backdrop-blur-sm z-30" style={{ height: 72 }}>
          <div className="flex items-center gap-3">
            {isMobile && !sidebarOpen && (
              <button
                onClick={() => setSidebarOpen(true)}
                className="h-9 w-9 p-0 rounded-lg hover:bg-bg-hover text-text-tertiary hover:text-text-primary transition-colors cursor-pointer flex items-center justify-center"
                title={t('layout.open_menu')}
                aria-label={t('layout.open_menu')}
              >
                <Menu className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-lg bg-bg-tertiary border border-border-subtle p-0.5">
              <button
                onClick={() => setLanguage('ru')}
                className={`flex items-center gap-1 h-9 px-3 rounded text-xs font-medium transition-colors cursor-pointer ${
                  language === 'ru' ? 'bg-bg-elevated text-text-primary' : 'text-text-tertiary hover:bg-bg-hover hover:text-text-primary'
                }`}
              >
                <Globe className="w-3 h-3 text-accent" />
                RU
              </button>
              <button
                onClick={() => setLanguage('en')}
                className={`flex items-center gap-1 h-9 px-3 rounded text-xs font-medium transition-colors cursor-pointer ${
                  language === 'en' ? 'bg-bg-elevated text-text-primary' : 'text-text-tertiary hover:text-text-secondary'
                }`}
              >
                <Globe className="w-3 h-3 text-info" />
                EN
              </button>
            </div>

            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setNotificationsOpen(prev => !prev)}
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
                    onClick={() => setNotificationsOpen(false)}
                    className="text-[11px] text-text-tertiary hover:bg-bg-hover hover:text-text-primary transition-colors cursor-pointer"
                  >
                    {t('header.notifications.close')}
                  </button>
                </div>
              </div>
            </div>

            <button
              onClick={openSettings}
              className="h-9 w-9 p-0 rounded-lg text-text-tertiary hover:bg-bg-hover hover:text-text-primary transition-colors cursor-pointer flex items-center justify-center"
              title={t('header.settings')}
              aria-label={t('header.settings')}
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </header>

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

      {isMobile ? (
        <BottomSheet
          open={settingsOpen}
          onClose={() => { setLanguage(savedLangRef.current); setSettingsOpen(false); }}
          title={t('header.settings')}
          icon={<Settings className="w-4 h-4 text-accent flex-shrink-0" />}
          ariaLabel={t('header.settings')}
          footer={
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setLanguage(savedLangRef.current); setSettingsOpen(false); }}
                className="flex-1 h-11 rounded-lg text-sm flex items-center justify-center gap-1.5 cursor-pointer bg-danger/10 text-danger hover:bg-danger/20 border border-danger/20"
              >
                <LogOut className="w-3.5 h-3.5" /> {t('header.settings.logout')}
              </button>
                <button
                  type="button"
                  onClick={() => setSettingsOpen(false)}
                  className="flex-1 h-11 rounded-lg bg-accent/25 text-white text-sm hover:bg-accent/35 transition-colors font-medium border border-accent/40 cursor-pointer"
                >
                  {t('header.settings.save')}
                </button>
            </div>
          }
        >
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-bg-tertiary border border-border-subtle">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-accent to-accent-hover flex items-center justify-center text-sm font-bold text-white ring-1 ring-accent/30 flex-shrink-0">
                GQ
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-text-primary truncate">{t('header.team')}</p>
                <p className="text-xs text-text-secondary truncate">product@gqbox.com</p>
                <span className="inline-flex items-center gap-1 mt-1 text-[10px] px-1.5 py-0.2 rounded bg-success/10 text-success">
                  <Shield className="w-2.5 h-2.5" /> {t('header.admin')}
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-medium text-text-tertiary">
                {t('header.settings.system_params')}
              </h4>

              <div className="flex items-center justify-between text-sm gap-2">
                <span className="text-text-secondary">
                  {t('header.settings.interface_lang')}
                </span>
                <div className="flex gap-1 bg-bg-tertiary p-0.5 rounded border border-border-subtle">
                  <button
                    onClick={() => setLanguage('ru')}
                    className={`h-9 px-3 rounded text-xs flex items-center cursor-pointer ${
                      language === 'ru'
                        ? 'bg-accent/25 text-white border border-accent/40'
                        : 'text-text-tertiary hover:bg-bg-hover hover:text-text-primary'
                    }`}
                  >
                    {t('header.settings.russian')}
                  </button>
                  <button
                    onClick={() => setLanguage('en')}
                    className={`h-9 px-3 rounded text-xs flex items-center cursor-pointer ${
                      language === 'en'
                        ? 'bg-accent/25 text-white border border-accent/40'
                        : 'text-text-tertiary hover:bg-bg-hover hover:text-text-primary'
                    }`}
                  >
                    English
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-text-secondary">
                  {t('header.settings.theme')}
                </span>
                <span className="text-xs text-text-tertiary px-2 py-0.5 rounded bg-bg-tertiary border border-border-subtle">
                  Futuristic Dark
                </span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-text-secondary">
                  {t('header.settings.db_version')}
                </span>
                <span className="text-xs text-accent">v2.4-normalized</span>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-medium text-text-tertiary">
                {t('header.settings.integrations')}
              </h4>
              <div className="flex items-center justify-between p-2 rounded bg-bg-tertiary text-xs">
                <span className="flex items-center gap-1.5 text-text-secondary">
                  <Key className="w-3.5 h-3.5 text-warning" /> Supabase API
                </span>
                <span className="text-text-tertiary">sbp_live_8f92...</span>
              </div>
            </div>
          </div>
        </BottomSheet>
      ) : settingsOpen && (
        <div
          onClick={closeSettings}
          className={`fixed inset-0 bg-black/40 z-[100] flex items-center justify-center p-4 backdrop-blur-sm t-backdrop${settingsClosing ? ' is-closing' : ''}`}
        >
            <div
              onClick={(e) => e.stopPropagation()}
              className={`t-modal glass-strong rounded-xl w-full max-w-md overflow-hidden border border-border-strong shadow-2xl${settingsOpen && !settingsClosing ? ' is-open' : ''}${settingsClosing ? ' is-closing' : ''}`}
            >
              <div className="p-4 border-b border-border-subtle flex items-center justify-between bg-bg-secondary">
                <div className="flex items-center gap-2">
                  <Settings className="w-4 h-4 text-accent" />
                  <h3 className="text-sm font-medium">{t('header.settings')}</h3>
                </div>
                <button onClick={closeSettings} className="p-1 rounded hover:bg-bg-hover hover:text-text-primary text-text-tertiary cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                <div className="flex items-center gap-4 p-3 rounded-lg bg-bg-tertiary border border-border-subtle">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-accent to-accent-hover flex items-center justify-center text-sm font-bold text-white ring-1 ring-accent/30">
                GQ
              </div>
                  <div>
                    <p className="text-sm font-medium text-text-primary">{t('header.team')}</p>
                    <p className="text-xs text-text-secondary">product@gqbox.com</p>
                    <span className="inline-flex items-center gap-1 mt-1 text-[10px] px-1.5 py-0.2 rounded bg-success/10 text-success">
                      <Shield className="w-2.5 h-2.5" /> {t('header.admin')}
                    </span>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-xs font-medium text-text-tertiary">{t('header.settings.system_params')}</h4>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-text-secondary">{t('header.settings.interface_lang')}</span>
                    <div className="flex gap-1 bg-bg-tertiary p-0.5 rounded border border-border-subtle">
                      <button
                        onClick={() => setLanguage('ru')}
                        className={`px-2 py-0.5 rounded text-xs ${language === 'ru' ? 'bg-accent/25 text-white border border-accent/40' : 'text-text-tertiary hover:bg-bg-hover hover:text-text-primary'} cursor-pointer`}
                      >
                        {t('header.settings.russian')}
                      </button>
                      <button
                        onClick={() => setLanguage('en')}
                        className={`px-2 py-0.5 rounded text-xs cursor-pointer ${language === 'en' ? 'bg-accent/25 text-white border border-accent/40' : 'text-text-tertiary'}`}
                      >
                        {t('header.settings.english')}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-text-secondary">{t('header.settings.theme')}</span>
                    <span className="text-xs text-text-tertiary px-2 py-0.5 rounded bg-bg-tertiary border border-border-subtle">
                      Futuristic Dark
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-text-secondary">{t('header.settings.db_version')}</span>
                    <span className="text-xs text-accent">v2.4-normalized</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-xs font-medium text-text-tertiary">{t('header.settings.integrations')}</h4>
                  <div className="flex items-center justify-between p-2 rounded bg-bg-tertiary text-xs">
                    <span className="flex items-center gap-1.5 text-text-secondary">
                      <Key className="w-3.5 h-3.5 text-warning" /> Supabase API
                    </span>
                    <span className="text-text-tertiary">sbp_live_8f92...</span>
                  </div>
                </div>
              </div>

              <div className="p-3 border-t border-border-subtle bg-bg-secondary flex justify-between items-center">
                <button
                  onClick={closeSettings}
                  className="flex items-center gap-1 text-xs transition-all cursor-pointer bg-danger/10 text-danger hover:bg-danger/20 px-2 py-1 rounded border border-danger/20"
                >
                  <LogOut className="w-3 h-3" /> {t('header.settings.logout_full')}
                </button>
                <button
                  onClick={saveSettings}
                  className="px-4 py-1.5 bg-accent/25 text-white rounded text-xs hover:bg-accent/35 transition-colors font-medium border border-accent/40 cursor-pointer"
                >
                  {t('header.settings.save')}
                </button>
              </div>
            </div>
          </div>
        )}
    </div>
    </LayoutProvider>
  );
}