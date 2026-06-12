import { useLanguage } from '@context/LanguageContext';

interface DevModeBadgeProps {
  active: boolean;
}

export default function DevModeBadge({ active }: DevModeBadgeProps) {
  const { t } = useLanguage();

  if (!active) return null;

  return (
    <div
      title={t('header.dev_mode.tooltip')}
      aria-label={t('header.dev_mode.tooltip')}
      className="animate-fade-in relative flex items-center gap-1.5 sm:gap-2 h-8 sm:h-9 pl-2 sm:pl-2.5 pr-2.5 sm:pr-3 rounded-lg bg-gradient-to-r from-warning/15 via-warning/10 to-danger/10 border border-warning/30 backdrop-blur-sm overflow-hidden cursor-default select-none shadow-[0_0_18px_-4px_rgba(251,191,36,0.35)]"
    >
      <span
        aria-hidden
        className="pointer-events-none absolute -top-10 -bottom-10 w-48"
        style={{
          animation: 'dev-mode-scan 5s linear infinite',
          background: 'linear-gradient(to right, transparent 0%, transparent 25%, rgba(251,191,36,0.04) 35%, rgba(251,191,36,0.18) 50%, rgba(251,191,36,0.04) 65%, transparent 75%, transparent 100%)',
        }}
      />

      <span
        aria-hidden
        className="dev-mode-glow relative font-mono font-bold text-warning text-[12px] sm:text-[13px] leading-none flex-shrink-0"
        style={{ animation: 'dev-mode-glow 1.8s ease-in-out infinite' }}
      >
        {'</>'}
      </span>

      <span className="relative max-[359px]:hidden text-[10px] sm:text-xs font-bold tracking-[0.18em] text-warning leading-none">
        DEV
      </span>

      <span
        className="relative hidden lg:inline text-warning/30 text-[10px] leading-none"
        aria-hidden
      >
        ·
      </span>

      <span className="relative hidden lg:inline text-[10px] font-mono font-medium text-warning/70 leading-none">
        {t('header.dev_mode.subtitle')}
      </span>
    </div>
  );
}
