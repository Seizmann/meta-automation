import { CheckCircle, AlertCircle } from 'lucide-react';

/**
 * Toast component for displaying status messages and alerts.
 */
export default function Toast({ toast }) {
  if (!toast) return null;

  const { message, type } = toast;
  const isError = type === 'error';

  return (
    <div className={`toast ${isError ? 'toast-error' : ''}`}>
      {isError ? (
        <AlertCircle size={16} style={{ marginRight: '8px', flexShrink: 0 }} />
      ) : (
        <CheckCircle size={16} style={{ marginRight: '8px', flexShrink: 0 }} />
      )}
      <span>{message}</span>
    </div>
  );
}
