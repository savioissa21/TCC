import { useToast } from "../../hooks/useToast";
import { X, CheckCircle, XCircle, Info, AlertTriangle } from "lucide-react";
import { cn } from "../../lib/utils";

const icons = {
  success: <CheckCircle size={18} className="shrink-0 text-emerald-700" />,
  error: <XCircle size={18} className="shrink-0 text-red-700" />,
  info: <Info size={18} className="shrink-0 text-sky-700" />,
  warning: <AlertTriangle size={18} className="shrink-0 text-amber-700" />,
};

const styles = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-950",
  error: "border-red-200 bg-red-50 text-red-900",
  info: "border-sky-200 bg-sky-50 text-sky-950",
  warning: "border-yellow-200 bg-yellow-50 text-yellow-900",
};

export function ToastContainer() {
  const { toasts, remove } = useToast();

  return (
    <div aria-live="polite" aria-relevant="additions" className="fixed right-4 top-4 z-50 flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            "flex items-start gap-3 rounded-xl border px-4 py-3 text-sm font-semibold shadow-lift backdrop-blur-sm animate-in slide-in-from-right-4 duration-300",
            styles[t.type]
          )}
        >
          {icons[t.type]}
          <span className="flex-1 leading-snug">{t.message}</span>
          <button aria-label="Fechar notificação" onClick={() => remove(t.id)} className="flex h-8 w-8 items-center justify-center rounded-lg opacity-60 transition-opacity hover:bg-black/5 hover:opacity-100">
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
