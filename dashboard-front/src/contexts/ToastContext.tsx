import { useMemo, useState, useCallback, type ReactNode } from "react";
import { ToastContext, type Toast, type ToastType } from "../hooks/useToast";

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const add = useCallback((message: string, type: ToastType) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4500);
  }, []);

  const remove = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useMemo(() => ({
    success: (msg: string) => add(msg, "success"),
    error: (msg: string) => add(msg, "error"),
    info: (msg: string) => add(msg, "info"),
    warning: (msg: string) => add(msg, "warning"),
  }), [add]);

  return (
    <ToastContext.Provider value={{ toasts, toast, remove }}>
      {children}
    </ToastContext.Provider>
  );
}
