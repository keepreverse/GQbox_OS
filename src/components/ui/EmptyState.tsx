import { Database } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description: string;
}

export default function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full bg-accent/10 blur-3xl opacity-40 pointer-events-none" />
      <div className="relative z-10 flex flex-col items-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center">
          <Database className="w-8 h-8 text-accent" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-semibold text-text-primary">{title}</p>
          <p className="text-xs text-text-tertiary max-w-[240px] leading-relaxed">{description}</p>
        </div>
      </div>
    </div>
  );
}
