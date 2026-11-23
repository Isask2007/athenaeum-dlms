import React, { createContext, useCallback, useContext, useState } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);
const ICONS = { success: CheckCircle2, error: AlertCircle, info: Info };
const TONES = {
  success: 'text-emerald-600 dark:text-emerald-400',
  error: 'text-rose-600 dark:text-rose-400',
  info: 'text-ink-600 dark:text-ink-300',
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const dismiss = useCallback((id) => setToasts((list) => list.filter((t) => t.id !== id)), []);
  const toast = useCallback((message, type = 'success', detail = '') => {
    const id = Math.random().toString(36).slice(2);
    setToasts((list) => [...list.slice(-3), { id, message, type, detail }]);
    window.setTimeout(() => dismiss(id), 4200);
  }, [dismiss]);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-20 right-4 z-[100] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2 sm:bottom-6">
        {toasts.map((item) => {
          const Icon = ICONS[item.type] || Info;
          return (
            <div key={item.id} className="animate-fade-up flex items-start gap-3 rounded-xl border border-paper-300 bg-white p-3.5 shadow-lift dark:border-ink-700 dark:bg-ink-800">
              <Icon size={19} className={`mt-0.5 shrink-0 ${TONES[item.type]}`} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-ink-900 dark:text-white">{item.message}</p>
                {item.detail && <p className="mt-0.5 text-xs text-ink-500 dark:text-ink-300">{item.detail}</p>}
              </div>
              <button onClick={() => dismiss(item.id)} className="rounded p-0.5 text-ink-400 hover:text-ink-700" aria-label="Dismiss">
                <X size={15} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
