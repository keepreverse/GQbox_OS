import { useState, useEffect, useRef, useCallback } from 'react';
import { Settings, LogOut, Shield, Code2, Key, Download, Upload, RotateCcw, Database } from 'lucide-react';
import Modal from '@components/ui/Modal';
import Toggle from '@components/ui/Toggle';
import { useLanguage } from '@context/LanguageContext';
import type { Language } from '@context/LanguageContext';
import { useDataSource } from '@api/dataSourceContext';

interface SettingsPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  developerMode: boolean;
  onDeveloperModeChange: (next: boolean) => void;
}

function SettingsRow({ label, value, description }: { label: React.ReactNode; value: React.ReactNode; description?: React.ReactNode }) {
  return (
    <div className="flex flex-col">
      <div
        className="flex items-center justify-between gap-4"
        style={{ minHeight: 'clamp(2rem, 2.5vw, 2.5rem)' }}
      >
        <span className="text-sm text-text-secondary leading-none flex-1 min-w-0">{label}</span>
        <div className="flex items-center justify-end shrink-0 w-32">{value}</div>
      </div>
      {description && (
        <p className="text-xs text-text-tertiary mt-1 leading-relaxed">{description}</p>
      )}
    </div>
  );
}

export default function SettingsPanel({
  open,
  onOpenChange,
  developerMode,
  onDeveloperModeChange,
}: SettingsPanelProps) {
  const { language, setLanguage, t } = useLanguage();
  const ds = useDataSource();
  const [pendingDevMode, setPendingDevMode] = useState(developerMode);
  const savedLangRef = useRef<Language>(language);
  const prevOpenRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = useCallback(async () => {
    try {
      await ds.settings.exportToFile();
    } catch (err) {
      alert('Export error: ' + (err as Error).message);
    }
  }, [ds]);

  const handleImport = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      await ds.settings.importFromFile(text);
      await ds.refresh();
      ds.notifications.add({ title: t('settings.notif_imported'), type: 'success' });
      alert('Import successful');
    } catch (err) {
      alert('Import error: ' + (err as Error).message);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [ds, t]);

  const handleReset = useCallback(async () => {
    if (!window.confirm(t('settings.reset_confirm'))) return;
    try {
      await ds.settings.reset();
      await ds.refresh();
      ds.notifications.add({ title: t('settings.notif_reset'), type: 'warning' });
      alert(t('settings.notif_reset'));
    } catch (err) {
      alert('Reset error: ' + (err as Error).message);
    }
  }, [ds, t]);

  const handleSeed = useCallback(async () => {
    if (!window.confirm(t('settings.seed_confirm'))) return;
    try {
      await ds.settings.seed();
      await ds.refresh();
      ds.notifications.add({ title: t('settings.notif_seeded'), type: 'success' });
      alert(t('settings.notif_seeded'));
    } catch (err) {
      alert('Seed error: ' + (err as Error).message);
    }
  }, [ds, t]);

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
    const changed = pendingDevMode !== developerMode;
    if (changed) {
      const wasDevModeOff = !developerMode;
      onDeveloperModeChange(pendingDevMode);
      if (pendingDevMode && wasDevModeOff) {
        window.alert(
          'Режим разработчика активирован.\n\n' +
            'Приложение переключено на /api/dev/* (PostgreSQL).\n' +
            'Для работы необходимо:\n' +
            '  1. npm run db:start\n' +
            '  2. npm run db:seed\n\n' +
            'Текущая сессия (demo) сохранена отдельно — при выключении режима вы вернётесь к ней без потерь.'
        );
      }
    }
    onOpenChange(false);
    if (changed) window.location.reload();
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
          <h4 className="text-xs font-medium text-text-tertiary">
            {t('header.settings.system_params')}
          </h4>

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

        <div className="space-y-2">
          <h4 className="text-xs font-medium text-text-tertiary">
            {t('settings.data_management')}
          </h4>
          {pendingDevMode ? (
            <button
              type="button"
              onClick={handleSeed}
              className="w-full py-1.5 rounded-lg bg-success/10 text-success text-xs font-medium flex items-center justify-center gap-1.5 hover:bg-success/20 transition-colors border border-success/20 cursor-pointer"
            >
              <Database className="w-3.5 h-3.5" />
              {t('settings.seed')}
            </button>
          ) : (
            <>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={handleExport}
                  className="flex-1 py-1.5 rounded-lg bg-accent/15 text-accent text-xs font-medium flex items-center justify-center gap-1.5 hover:bg-accent/25 transition-colors border border-accent/30 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  {t('settings.export')}
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 py-1.5 rounded-lg bg-bg-tertiary text-text-secondary text-xs flex items-center justify-center gap-1.5 hover:bg-bg-hover hover:border-accent/30 transition-colors border border-dashed border-border-subtle cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5 text-accent" />
                  {t('settings.import')}
                </button>
              </div>
              <button
                type="button"
                onClick={handleReset}
                className="w-full py-1.5 rounded-lg bg-danger/10 text-danger text-xs font-medium flex items-center justify-center gap-1.5 hover:bg-danger/20 transition-colors border border-danger/20 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                {t('settings.reset_to_defaults')}
              </button>
            </>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleImport}
          className="hidden"
        />
      </div>
    </Modal>
  );
}
