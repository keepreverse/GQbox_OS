import { useState, useEffect, useRef, useCallback } from 'react';
import { Settings, LogOut, Shield, Code2, Key } from 'lucide-react';
import Modal from '@components/ui/Modal';
import Toggle from '@components/ui/Toggle';
import SettingsRow from '@components/ui/SettingsRow';
import { useLanguage } from '@context/LanguageContext';
import type { Language } from '@context/LanguageContext';

interface SettingsPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  developerMode: boolean;
  onDeveloperModeChange: (next: boolean) => void;
}

export default function SettingsPanel({
  open,
  onOpenChange,
  developerMode,
  onDeveloperModeChange,
}: SettingsPanelProps) {
  const { language, setLanguage, t } = useLanguage();
  const [pendingDevMode, setPendingDevMode] = useState(developerMode);
  const savedLangRef = useRef<Language>(language);
  const prevOpenRef = useRef(false);

  useEffect(() => {
    if (open && !prevOpenRef.current) {
      savedLangRef.current = language;
      setPendingDevMode(developerMode);
    }
    prevOpenRef.current = open;
  }, [open, language, developerMode]);

  const handleClose = useCallback(() => {
    setLanguage(savedLangRef.current);
    setPendingDevMode(developerMode);
    onOpenChange(false);
  }, [setLanguage, developerMode, onOpenChange]);

  const handleSave = useCallback(() => {
    const wasDevModeOff = !developerMode;
    onDeveloperModeChange(pendingDevMode);
    if (pendingDevMode && wasDevModeOff) {
      console.info(
        '%c[Developer Mode] Активирован (демо)\n' +
        'Что происходит: переключатель зафиксировал, что вы вошли в режим разработчика.\n' +
        'Что будет дальше (итерация 2): при включении режима данные текущей тестовой сессии\n' +
        '  остаются в localStorage (gqbox_test_*), а приложение начнёт работать с PostgreSQL.\n' +
        '  При выключении — возврат к тестовой сессии без потерь.\n' +
        'Зачем: позволяет параллельно тестировать визуальные фичи в браузере и реальную\n' +
        '  работу с БД в dev-сессии, не перемешивая данные.',
        'color: #7dd3fc; font-weight: 500;'
      );
      window.alert(
        'Вы вошли в режим разработчика (демо).\n\n' +
        'Что происходит:\n' +
        '— Переключатель зафиксирован. Реальное подключение к PostgreSQL появится в следующей итерации.\n\n' +
        'Зачем нужен этот режим:\n' +
        '— Тестовая сессия (localStorage) и dev-сессия (PostgreSQL) хранятся отдельно. Можно тестировать визуальные фичи в браузере и реальную работу с БД параллельно, не теряя данные.'
      );
    }
    onOpenChange(false);
  }, [developerMode, pendingDevMode, onDeveloperModeChange, onOpenChange]);

  const handleDeveloperToggle = useCallback((next: boolean) => {
    setPendingDevMode(next);
  }, []);

  return (
    <Modal
      variant="auto"
      width="md"
      open={open}
      onClose={handleClose}
      height="clamp(75dvh, 80dvh, 95dvh)"
      pinned
      title={t('header.settings')}
      icon={<Settings className="w-4 h-4 text-accent flex-shrink-0" />}
      ariaLabel={t('header.settings')}
      contentClassName="p-4 sm:p-6"
      footer={
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleClose}
            className="flex-1 h-11 rounded-lg text-sm flex items-center justify-center gap-1.5 cursor-pointer bg-danger/10 text-danger hover:bg-danger/20 border border-danger/20"
          >
            <LogOut className="w-3.5 h-3.5" /> {t('header.settings.logout')}
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex-1 h-11 rounded-lg bg-accent/25 text-white text-sm hover:bg-accent/35 transition-colors font-medium border border-accent/40 cursor-pointer"
          >
            {t('header.settings.save')}
          </button>
        </div>
      }
    >
      <div className="space-y-4 sm:space-y-6">
        <div className="flex items-center gap-3 sm:gap-4 p-3 rounded-lg bg-bg-tertiary border border-border-subtle">
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
          <h4 className="text-xs font-medium text-text-tertiary">{t('header.settings.system_params')}</h4>

          <SettingsRow
            label={t('header.settings.interface_lang')}
            value={
              <div className="w-full flex gap-0.5 bg-bg-tertiary p-0.5 rounded border border-border-subtle">
                <button
                  onClick={() => setLanguage('ru')}
                  className={`flex-1 px-2 py-0.5 rounded text-xs transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent/40 ${
                    language === 'ru'
                      ? 'bg-accent/20 text-text-primary'
                      : 'text-text-tertiary hover:bg-bg-hover hover:text-text-primary'
                  }`}
                >
                  RU
                </button>
                <button
                  onClick={() => setLanguage('en')}
                  className={`flex-1 px-2 py-0.5 rounded text-xs transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent/40 ${
                    language === 'en'
                      ? 'bg-accent/20 text-text-primary'
                      : 'text-text-tertiary hover:bg-bg-hover hover:text-text-primary'
                  }`}
                >
                  EN
                </button>
              </div>
            }
          />

          <SettingsRow
            label={t('header.settings.theme')}
            value={
              <span className="w-full text-center text-xs text-text-tertiary px-2 py-0.5 rounded bg-bg-tertiary border border-border-subtle">
                Futuristic Dark
              </span>
            }
          />

          <SettingsRow
            label={t('header.settings.db_version')}
            value={
              <span className="w-full text-center text-xs text-accent px-2 py-0.5 rounded bg-bg-tertiary border border-border-subtle">
                v2.4-normalized
              </span>
            }
          />
        </div>

        <div className="space-y-3">
          <h4 className="text-xs font-medium text-text-tertiary">{t('settings.work_mode')}</h4>

          <SettingsRow
            label={
              <span className="flex items-center gap-1.5">
                <Code2 className="w-3.5 h-3.5 text-accent" />
                {t('settings.developer_mode')}
              </span>
            }
            value={
              <Toggle
                checked={pendingDevMode}
                onChange={handleDeveloperToggle}
                ariaLabel={t('settings.developer_mode')}
                title={t('settings.developer_mode')}
              />
            }
            description={
              pendingDevMode
                ? t('settings.developer_mode_active')
                : t('settings.developer_mode_desc')
            }
          />
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
    </Modal>
  );
}
