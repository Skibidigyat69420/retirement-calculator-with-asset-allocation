import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { cn } from '../../lib/utils';

export type ToastVariant = 'success' | 'error' | 'info';

export interface ToastItem {
  id: number;
  variant: ToastVariant;
  title: string;
  description?: string;
}

export interface ToastOptions {
  description?: string;
  /** Auto-dismiss delay in ms; errors default to staying longer. */
  duration?: number;
}

export interface ToastApi {
  success: (title: string, options?: ToastOptions) => void;
  error: (title: string, options?: ToastOptions) => void;
  info: (title: string, options?: ToastOptions) => void;
  dismiss: (id: number) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

const variantConfig: Record<ToastVariant, { icon: React.ReactNode; ring: string }> = {
  success: {
    icon: <CheckCircle2 size={17} className="text-positive" aria-hidden="true" />,
    ring: 'border-positive/30',
  },
  error: {
    icon: <AlertCircle size={17} className="text-negative" aria-hidden="true" />,
    ring: 'border-negative/30',
  },
  info: {
    icon: <Info size={17} className="text-info" aria-hidden="true" />,
    ring: 'border-info/30',
  },
};

let nextId = 1;

/**
 * Toast provider (§116 alert roles): renders a fixed bottom-right stack
 * (polished by the global toast CSS in index.css). Wrap once near the app
 * root; consume with `useToast()`.
 */
export const ToastProvider = ({ children }: { children: React.ReactNode }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const push = useCallback(
    (variant: ToastVariant, title: string, options?: ToastOptions) => {
      const id = nextId++;
      const duration = options?.duration ?? (variant === 'error' ? 8000 : 4500);
      setToasts((current) => [...current.slice(-3), { id, variant, title, description: options?.description }]);
      window.setTimeout(() => dismiss(id), duration);
    },
    [dismiss],
  );

  const api = useMemo<ToastApi>(
    () => ({
      success: (title, options) => push('success', title, options),
      error: (title, options) => push('error', title, options),
      info: (title, options) => push('info', title, options),
      dismiss,
    }),
    [push, dismiss],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      {createPortal(
        <div className="fixed bottom-5 right-5 z-50 flex flex-col w-[min(92vw,22rem)]" aria-live="polite">
          <AnimatePresence initial={false}>
            {toasts.map((toast) => (
              <motion.div
                key={toast.id}
                layout
                initial={{ opacity: 0, y: 8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 4, scale: 0.98 }}
                transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                role={toast.variant === 'error' ? 'alert' : 'status'}
                className={cn(
                  'flex items-start gap-2.5 p-3.5 bg-surface/95 border',
                  variantConfig[toast.variant].ring,
                )}
              >
                <span className="mt-0.5 shrink-0">{variantConfig[toast.variant].icon}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-ink leading-snug">{toast.title}</p>
                  {toast.description && (
                    <p className="mt-0.5 text-xs text-muted leading-relaxed">{toast.description}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => dismiss(toast.id)}
                  aria-label="Dismiss notification"
                  className="shrink-0 size-6 inline-flex items-center justify-center rounded-md text-muted hover:text-ink hover:bg-sunken cursor-pointer"
                >
                  <X size={13} />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  );
};

export function useToast(): ToastApi {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a <ToastProvider>');
  }
  return context;
}
