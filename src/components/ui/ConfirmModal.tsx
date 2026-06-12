import { AlertTriangle, Info, XCircle } from 'lucide-react';
import Modal from './Modal';
import { useLanguage } from '@context/LanguageContext';

export type ConfirmVariant = 'danger' | 'warning' | 'info';

interface ConfirmModalProps {
  open: boolean;
  title: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmVariant;
  onConfirm: () => void;
  onCancel: () => void;
}

const ICONS: Record<ConfirmVariant, { icon: typeof AlertTriangle; classes: string }> = {
  danger: { icon: XCircle, classes: 'text-danger' },
  warning: { icon: AlertTriangle, classes: 'text-warning' },
  info: { icon: Info, classes: 'text-accent' },
};

export default function ConfirmModal({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel,
  variant = 'danger',
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const { t } = useLanguage();
  const cfg = ICONS[variant];
  const Icon = cfg.icon;

  return (
    <Modal
      variant="centered"
      width="sm"
      open={open}
      onClose={onCancel}
      ariaLabel={title}
      contentClassName="p-5"
      footer={
        <div className="flex gap-2 w-full">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 h-11 rounded-lg bg-bg-tertiary text-text-secondary text-sm hover:bg-bg-hover hover:text-text-primary transition-colors font-medium border border-border-subtle cursor-pointer"
          >
            {cancelLabel ?? t('common.cancel')}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`flex-1 h-11 rounded-lg text-white text-sm transition-colors font-medium cursor-pointer border ${
              variant === 'danger'
                ? 'bg-danger/25 hover:bg-danger/35 border-danger/40'
                : variant === 'warning'
                  ? 'bg-warning/25 hover:bg-warning/35 border-warning/40 text-text-primary'
                  : 'bg-accent/25 hover:bg-accent/35 border-accent/40'
            }`}
          >
            {confirmLabel ?? t('common.confirm')}
          </button>
        </div>
      }
    >
      <div className="flex items-start gap-3">
        <div className={`flex-shrink-0 ${cfg.classes}`}>
          <Icon className="w-6 h-6" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
          {description && (
            <p className="text-xs text-text-secondary mt-1.5 leading-relaxed">{description}</p>
          )}
        </div>
      </div>
    </Modal>
  );
}
