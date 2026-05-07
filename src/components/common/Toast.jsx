import { useStore } from '@store';
import { CheckIcon, XIcon, InfoIcon } from './Icons';

export function ToastContainer() {
  const { toasts, removeToast } = useStore();

  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast ${toast.type}`} onClick={() => removeToast(toast.id)}>
          {toast.type === 'success' && <CheckIcon size={16} />}
          {toast.type === 'error' && <XIcon size={16} />}
          {toast.type === 'info' && <InfoIcon size={16} />}
          <span>{toast.message}</span>
        </div>
      ))}
    </div>
  );
}
