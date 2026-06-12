import type { CSSProperties } from 'react';
import { AlertTriangle } from 'lucide-react';

function useReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

type LoaderStyle = CSSProperties & Record<`--${string}`, string>;

const textBaseStyle: LoaderStyle = {
  fontSize: 'clamp(2.25rem, 5vw, 3rem)',
  lineHeight: 1,
  letterSpacing: '-0.045em',
  fontWeight: 700,

  '--ldr-edge': 'color-mix(in srgb, var(--color-text-muted) 10%, var(--color-bg-primary) 90%)',
  '--ldr-soft': 'color-mix(in srgb, var(--color-accent) 20%, var(--color-bg-elevated) 80%)',
  '--ldr-mid': 'color-mix(in srgb, var(--color-accent) 55%, var(--color-bg-elevated) 45%)',
  '--ldr-glow': 'color-mix(in srgb, var(--color-accent) 85%, var(--color-bg-elevated) 15%)',
  '--ldr-glint': 'var(--color-accent)',

  backgroundImage:
    'linear-gradient(135deg, var(--ldr-edge) 0%, var(--ldr-edge) 20%, var(--ldr-soft) 30%, var(--ldr-mid) 40%, var(--ldr-glow) 46%, var(--ldr-glint) 50%, var(--ldr-glow) 54%, var(--ldr-mid) 60%, var(--ldr-soft) 70%, var(--ldr-edge) 80%, var(--ldr-edge) 100%)',
  backgroundSize: '300% 100%',
  backgroundPosition: '150% 0%',

  WebkitBackgroundClip: 'text',
  backgroundClip: 'text',
  WebkitTextFillColor: 'transparent',

  willChange: 'background-position, opacity, filter',
};

interface FullScreenLoaderProps {
  exiting?: boolean;
  devError?: string | null;
}

export default function FullScreenLoader({ exiting, devError }: FullScreenLoaderProps) {
  const shouldReduceMotion = useReducedMotion();

  function handleSwitchToDemo() {
    localStorage.setItem('gqbox_dev_mode', 'false');
    window.location.reload();
  }

  const textAnimateStyle: LoaderStyle = {
    ...textBaseStyle,
    ...(shouldReduceMotion
      ? {}
      : {
          animation: 'loaderTextIn 1.2s cubic-bezier(0.22, 1, 0.36, 1) 0.4s forwards, loaderGradient 5s linear infinite',
          opacity: 0,
        }),
  };

  const lineStyle: CSSProperties = {
    width: 'clamp(120px, 65%, 280px)',
    height: 2,
    background: 'linear-gradient(90deg, transparent, var(--color-accent), transparent)',
    transformOrigin: 'center',
    boxShadow: '0 0 12px color-mix(in srgb, var(--color-accent) 40%, transparent)',
    ...(shouldReduceMotion
      ? {}
      : {
          animation: 'loaderLineIn 1.8s cubic-bezier(0.22, 1, 0.36, 1) 0.4s forwards',
          opacity: 0,
        }),
  };

  return (
    <div
      role="status"
      aria-label="Загрузка"
      className={`fixed inset-0 z-[9999] isolate flex items-center justify-center bg-bg-primary transition-opacity duration-[550ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${
        exiting ? 'opacity-0' : 'opacity-100'
      }`}
    >
      <div className="relative flex flex-col items-center justify-center gap-5">
        <span
          aria-hidden="true"
          className="relative select-none"
          style={textAnimateStyle}
        >
          GQbox
        </span>

        <div style={lineStyle} />

        <div
          className={`flex flex-col items-center gap-3 transition-all duration-400 ease-[cubic-bezier(0.22,1,0.36,1)] ${
            devError ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'
          }`}
        >
          <p className="text-xs text-text-secondary text-center max-w-[260px] leading-relaxed">
            {devError}
          </p>
          <button
            type="button"
            onClick={handleSwitchToDemo}
            className="flex items-center gap-1.5 rounded-lg bg-accent/25 text-white text-sm hover:bg-accent/35 transition-colors font-medium border border-accent/40 cursor-pointer px-4 py-2"
          >
            <AlertTriangle className="size-4 shrink-0" />
            <span>Переключиться на Demo-режим</span>
          </button>
        </div>
      </div>
    </div>
  );
}