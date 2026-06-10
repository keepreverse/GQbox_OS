import type { CSSProperties } from 'react';
import { motion, useReducedMotion, AnimatePresence } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';

const EASE = [0.22, 1, 0.36, 1] as const;

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

  willChange: 'background-position, transform, opacity, filter',
};

interface FullScreenLoaderProps {
  devError?: string | null;
}

export default function FullScreenLoader({ devError }: FullScreenLoaderProps) {
  const shouldReduceMotion = useReducedMotion();

  function handleSwitchToDemo() {
    localStorage.setItem('gqbox_dev_mode', 'false');
    window.location.reload();
  }

  return (
    <motion.div
      role="status"
      aria-label="Загрузка"
      className="fixed inset-0 z-[9999] isolate flex items-center justify-center bg-bg-primary"
      exit={{ opacity: 0, scale: 1.1 }}
      transition={{ duration: 0.55, ease: EASE }}
    >
      <div className="relative flex flex-col items-center justify-center gap-5">
        <motion.span
          aria-hidden="true"
          className="relative select-none"
          style={textBaseStyle}
          initial={
            shouldReduceMotion
              ? false
              : { opacity: 0, y: 10, scale: 0.95, filter: 'blur(10px)', backgroundPosition: '150% 0%' }
          }
          animate={
            shouldReduceMotion
              ? { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }
              : {
                  opacity: 1,
                  y: 0,
                  scale: 1,
                  filter: 'blur(0px)',
                  backgroundPosition: ['150% 0%', '-150% 0%'],
                }
          }
          transition={
            shouldReduceMotion
              ? { duration: 0.35, ease: EASE }
              : {
                  opacity: { duration: 1.2, delay: 0.4, ease: EASE },
                  y: { duration: 1.2, delay: 0.4, ease: EASE },
                  scale: { duration: 1.2, delay: 0.4, ease: EASE },
                  filter: { duration: 1.2, delay: 0.4, ease: EASE },
                  backgroundPosition: {
                    duration: 5,
                    repeat: Infinity,
                    repeatType: 'loop',
                    ease: 'linear',
                  },
                }
          }
        >
          GQbox
        </motion.span>

        <motion.div
          className="h-0.5"
          style={{
            width: 'clamp(120px, 65%, 280px)',
            background: 'linear-gradient(90deg, transparent, var(--color-accent), transparent)',
            transformOrigin: 'center',
            boxShadow: '0 0 12px color-mix(in srgb, var(--color-accent) 40%, transparent)',
          }}
          initial={
            shouldReduceMotion
              ? false
              : { opacity: 0, scaleX: 0, y: 10, filter: 'blur(10px)' }
          }
          animate={
            shouldReduceMotion
              ? { opacity: 1, scaleX: 1, y: 0, filter: 'blur(0px)' }
              : { opacity: 1, scaleX: 1, y: 0, filter: 'blur(0px)' }
          }
          transition={
            shouldReduceMotion
              ? { duration: 0.35, ease: EASE }
              : {
                  opacity: { duration: 1.2, delay: 0.4, ease: EASE },
                  scaleX: { duration: 1.8, delay: 0.4, ease: 'easeOut' },
                  y: { duration: 1.2, delay: 0.4, ease: EASE },
                  filter: { duration: 1.2, delay: 0.4, ease: EASE },
                }
          }
        />

        <AnimatePresence>
          {devError && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.4, ease: EASE }}
              className="flex flex-col items-center gap-3"
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
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}