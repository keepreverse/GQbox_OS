import { AlertCircle } from 'lucide-react';

interface ErrorAlertProps {
  message: string;
}

export default function ErrorAlert({ message }: ErrorAlertProps) {
  return (
    <div className="p-3 rounded-lg bg-danger/10 border border-danger/20 text-xs text-danger flex items-center gap-2">
      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
      <span className="break-all">{message}</span>
    </div>
  );
}
