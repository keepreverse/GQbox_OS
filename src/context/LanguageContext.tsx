// ─── LanguageContext + i18n ──────────────────────────────────────────────
// Словари вынесены в `src/i18n/ru.ts` (синхронно) и `src/i18n/en.ts` (lazy).
// Провайдер держит активный словарь в state и подгружает `en` при первом
// переключении. `t(key, params?)` поддерживает интерполяцию `{n}`, `{name}`.

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { ru, type Dict } from '@i18n/ru';

export type Language = 'ru' | 'en';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  /**
   * Локализованное форматирование даты для TopBar.
   * Берёт locale и options из активного словаря (`topbar.time_ago.date_locale`,
   * `topbar.time_ago.date_options`), чтобы корректно работать с ru-RU/en-US.
   */
  formatShortDate: (iso: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

function interpolate(template: string, params?: Record<string, string | number>): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_, k: string) => {
    const v = params[k];
    return v == null ? `{${k}}` : String(v);
  });
}

function safeParseOptions(json: string | undefined): Intl.DateTimeFormatOptions {
  if (!json) return { day: 'numeric', month: 'short' };
  try {
    const parsed = JSON.parse(json) as Intl.DateTimeFormatOptions;
    return parsed;
  } catch {
    return { day: 'numeric', month: 'short' };
  }
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>('ru');
  // ru грузится синхронно при инициализации.
  const [dict, setDict] = useState<Dict>(ru);

  useEffect(() => {
    if (language === 'en') {
      let cancelled = false;
      import('@i18n/en').then((mod) => {
        if (!cancelled) setDict(mod.en);
      });
      return () => {
        cancelled = true;
      };
    }
    setDict(ru);
    return undefined;
  }, [language]);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
  }, []);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>): string => {
      const raw = dict[key] ?? ru[key] ?? key;
      return interpolate(raw, params);
    },
    [dict]
  );

  const formatShortDate = useCallback(
    (iso: string): string => {
      const locale = dict['topbar.time_ago.date_locale'] ?? ru['topbar.time_ago.date_locale'] ?? 'en-US';
      const options = safeParseOptions(
        dict['topbar.time_ago.date_options'] ?? ru['topbar.time_ago.date_options']
      );
      try {
        return new Date(iso).toLocaleDateString(locale, options);
      } catch {
        return new Date(iso).toLocaleDateString();
      }
    },
    [dict]
  );

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, formatShortDate }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
