import { useEffect, useRef } from "react";

/** Mantém o teclado no diálogo e devolve o foco ao controle de origem. */
export function useModalFocus(open: boolean, onEscape?: () => void) {
  const panel = useRef<HTMLDivElement>(null);
  const escape = useRef(onEscape);
  useEffect(() => { escape.current = onEscape; }, [onEscape]);
  useEffect(() => {
    if (!open || !panel.current) return;
    const previous = document.activeElement as HTMLElement | null;
    const element = panel.current;
    const controls = () => Array.from(element.querySelectorAll<HTMLElement>(
      'button:not(:disabled), input:not(:disabled), select:not(:disabled), a[href], [tabindex="0"]',
    ));
    (controls()[0] || element).focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && escape.current) {
        event.preventDefault();
        escape.current();
      }
      if (event.key !== "Tab") return;
      const items = controls();
      const first = items[0] || element;
      const last = items[items.length - 1] || element;
      if (event.shiftKey && (document.activeElement === first || document.activeElement === element)) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || document.activeElement === element)) {
        event.preventDefault(); first.focus();
      }
    };
    element.addEventListener("keydown", onKeyDown);
    return () => {
      element.removeEventListener("keydown", onKeyDown);
      if (previous?.isConnected) previous.focus();
    };
  }, [open]);
  return panel;
}
