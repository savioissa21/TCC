import { useToast } from "../../contexts/ToastContext";
import { X, CheckCircle, XCircle, Info, AlertTriangle } from "lucide-react";
import { cn } from "../../lib/utils";

const icons = {
  success: <CheckCircle size={18} className="text-green-500 shrink-0" />,
  error: <XCircle size={18} className="text-red-500 shrink-0" />,
  info: <Info size={18} className="text-blue-500 shrink-0" />,
  warning: <AlertTriangle size={18} className="text-yellow-500 shrink-0" />,
};

const styles = {
  success: "border-green-200 bg-green-50 text-green-900",
  error: "border-red-200 bg-red-50 text-red-900",
  info: "border-blue-200 bg-blue-50 text-blue-900",
  warning: "border-yellow-200 bg-yellow-50 text-yellow-900",
};

export function ToastContainer() {
  const { toasts, remove } = useToast();

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 w-80">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            "flex items-start gap-3 rounded-lg border px-4 py-3 shadow-lg animate-in slide-in-from-right-4 duration-300 text-sm font-medium",
            styles[t.type]
          )}
        >
          {icons[t.type]}
          <span className="flex-1 leading-snug">{t.message}</span>
          <button onClick={() => remove(t.id)} className="opacity-60 hover:opacity-100 transition-opacity">
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
