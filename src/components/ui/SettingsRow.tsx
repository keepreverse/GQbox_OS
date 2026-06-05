import type { ReactNode } from 'react';

interface SettingsRowProps {
  label: ReactNode;
  value: ReactNode;
  description?: ReactNode;
}

export default function SettingsRow({ label, value, description }: SettingsRowProps) {
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
