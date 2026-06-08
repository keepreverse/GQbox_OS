import type { CSSProperties } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

const EASE = [0.22, 1, 0.36, 1] as const;

type LoaderStyle = CSSProperties & Record<`--${string}`, string>;

const textBaseStyle: LoaderStyle = {
  fontSize: 'clamp(2rem, 4.5vw, 2.75rem)',
  lineHeight: 1,
  letterSpacing: '-0.035em',
  fontWeight: 500,

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

export default function FullScreenLoader() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      role="status"
      aria-label="Загрузка"
      className="fixed inset-0 z-[9999] isolate flex items-center justify-center bg-bg-primary"
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4, ease: EASE }}
    >
      <div className="relative flex flex-col items-center justify-center gap-4">
        <motion.span
          aria-hidden="true"
          className="relative select-none font-medium"
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
          className="h-px"
          style={{
            width: 'clamp(120px, 65%, 280px)',
            background: 'linear-gradient(90deg, transparent, var(--color-accent), transparent)',
            transformOrigin: 'center',
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
                  scaleX: { duration: 1.2, delay: 0.4, ease: EASE },
                  y: { duration: 1.2, delay: 0.4, ease: EASE },
                  filter: { duration: 1.2, delay: 0.4, ease: EASE },
                }
          }
        />
      </div>
    </motion.div>
  );
}