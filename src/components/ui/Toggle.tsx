import { useCallback } from 'react';

interface ToggleProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  ariaLabel?: string;
  title?: string;
}

const TRACK_W = 'clamp(2.25rem, 1.8vw, 2.75rem)';
const TRACK_H = 'clamp(1.125rem, 0.9vw, 1.375rem)';
const TRACK_PAD = 'clamp(2px, 0.15vw, 3px)';
const KNOB_SIZE = 'clamp(0.875rem, 0.7vw, 1.0625rem)';

export default function Toggle({
  checked,
  onChange,
  disabled = false,
  ariaLabel,
  title,
}: ToggleProps) {
  const handleClick = useCallback(() => {
    if (!disabled) onChange(!checked);
  }, [checked, disabled, onChange]);

  const handleKey = useCallback(
    (e: React.KeyboardEvent) => {
      if (disabled) return;
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        onChange(!checked);
      }
    },
    [checked, disabled, onChange]
  );

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      title={title}
      onClick={handleClick}
      onKeyDown={handleKey}
      disabled={disabled}
      className={`
        inline-flex items-center rounded-full border
        transition-all duration-150 ease-out
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50
        focus-visible:ring-offset-2 focus-visible:ring-offset-bg-secondary
        ${checked
          ? 'bg-accent/30 border-accent/40 justify-end'
          : 'bg-bg-tertiary border-border-subtle justify-start hover:border-border-strong'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
      style={{
        width: TRACK_W,
        height: TRACK_H,
        paddingInline: TRACK_PAD,
      }}
    >
      <span
        className={`
          block rounded-full transition-all duration-150 ease-out
          ${checked
            ? 'bg-white shadow-[0_1px_2px_rgba(0,0,0,0.4)]'
            : 'bg-text-tertiary'
          }
        `}
        style={{ width: KNOB_SIZE, height: KNOB_SIZE }}
      />
    </button>
  );
}
