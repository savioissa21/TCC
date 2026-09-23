import { useEffect, useRef, type ReactNode } from "react";

export function ModalFrame({ children, label, onClose }: { children: ReactNode; label: string; onClose?: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current!;
    const previous = document.activeElement as HTMLElement | null;
    if (dialog.showModal) dialog.showModal();
    else dialog.setAttribute("open", "");
    return () => { if (dialog.close) dialog.close(); previous?.focus(); };
  }, []);
  return <dialog ref={ref} aria-label={label} onCancel={event => { event.preventDefault(); onClose?.(); }}
    className="fixed inset-0 m-auto max-h-[90dvh] max-w-[calc(100%-2rem)] overflow-y-auto rounded-2xl border-0 bg-transparent p-0 backdrop:bg-black/60 backdrop:backdrop-blur-sm">
    {children}
  </dialog>;
}
