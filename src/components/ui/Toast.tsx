import { motion, AnimatePresence } from 'framer-motion';
import { Check, AlertTriangle, XCircle } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning';

export interface ToastData {
  message: string;
  type: ToastType;
}

export function Toast({ data, onClose }: { data: ToastData | null; onClose: () => void }) {
  const iconMap = { success: Check, error: XCircle, warning: AlertTriangle };
  const Icon = data ? iconMap[data.type] : Check;

  const bgMap = {
    success: 'bg-success text-white',
    error: 'bg-danger text-white',
    warning: 'bg-warning text-black',
  };

  return (
    <AnimatePresence>
      {data && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          onClick={onClose}
          className={`fixed top-20 right-4 z-[60] flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs shadow-lg cursor-pointer max-w-[min(90vw,400px)] ${bgMap[data.type]}`}
        >
          <Icon className="w-4 h-4 flex-shrink-0" />
          <span className="truncate" title={data.message}>
            {data.message}
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
