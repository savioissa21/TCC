import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Building2, Check, ChevronDown, CircleCheck, CircleDashed, CircleX, LoaderCircle, Star } from "lucide-react";
import type { EstablishmentSummary } from "../../types";

interface EstablishmentSelectorProps {
  stores: EstablishmentSummary[];
  selectedId?: number;
  onChange: (id?: number) => void;
}

type SelectorOption =
  | { kind: "all"; id: "all" }
  | { kind: "store"; id: number; store: EstablishmentSummary };

export function EstablishmentSelector({ stores, selectedId, onChange }: EstablishmentSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const listboxId = useId();

  const options = useMemo<SelectorOption[]>(
    () => [{ kind: "all", id: "all" }, ...stores.map((store) => ({ kind: "store" as const, id: store.id, store }))],
    [stores],
  );
  const selectedIndex = selectedId === undefined
    ? 0
    : Math.max(0, options.findIndex((option) => option.id === selectedId));
  const selectedStore = stores.find((store) => store.id === selectedId);
  const totalComments = stores.reduce((total, store) => total + Math.max(0, store.reviewCount), 0);

  useLayoutEffect(() => {
    if (!isOpen) return;
    setActiveIndex(selectedIndex);
    optionRefs.current[selectedIndex]?.focus();
  }, [isOpen, selectedIndex]);

  useEffect(() => {
    if (!isOpen) return;
    function closeOnOutsidePointer(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setIsOpen(false);
    }
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    return () => document.removeEventListener("pointerdown", closeOnOutsidePointer);
  }, [isOpen]);

  function open(direction: "selected" | "first" | "last" = "selected") {
    setActiveIndex(direction === "first" ? 0 : direction === "last" ? options.length - 1 : selectedIndex);
    setIsOpen(true);
  }

  function close({ restoreFocus = false } = {}) {
    setIsOpen(false);
    if (restoreFocus) triggerRef.current?.focus();
  }

  function choose(option: SelectorOption) {
    onChange(option.kind === "all" ? undefined : option.id);
    close({ restoreFocus: true });
  }

  function focusOption(index: number) {
    const boundedIndex = (index + options.length) % options.length;
    setActiveIndex(boundedIndex);
    optionRefs.current[boundedIndex]?.focus();
  }

  function handleTriggerKeyDown(event: React.KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp" || event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      open(event.key === "ArrowUp" ? "last" : "selected");
    }
  }

  function handleOptionKeyDown(event: React.KeyboardEvent<HTMLButtonElement>, index: number) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      focusOption(index + (event.key === "ArrowDown" ? 1 : -1));
      return;
    }
    if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      focusOption(event.key === "Home" ? 0 : options.length - 1);
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      choose(options[index]);
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      close({ restoreFocus: true });
    }
  }

  return (
    <div ref={rootRef} className="relative min-w-0 w-full sm:max-w-md">
      <button
        ref={triggerRef}
        type="button"
        role="combobox"
        aria-label="Estabelecimento"
        aria-haspopup="listbox"
        aria-controls={listboxId}
        aria-expanded={isOpen}
        onClick={() => isOpen ? close() : open()}
        onKeyDown={handleTriggerKeyDown}
        className="group flex min-h-14 w-full min-w-0 items-center gap-3 rounded-2xl border border-input bg-paper/65 px-3 py-2.5 text-left outline-none transition duration-300 hover:border-evergreen/40 hover:bg-surface focus-visible:border-evergreen focus-visible:ring-2 focus-visible:ring-evergreen/15"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent text-evergreen">
          <Building2 size={16} aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-black tracking-[-0.015em] text-ink" title={selectedStore?.name}>
            {selectedStore?.name ?? "Todas as lojas"}
          </span>
          <span className="mt-0.5 block truncate text-[0.68rem] font-semibold text-muted-foreground">
            {selectedStore
              ? `${selectedStore.reviewCount} ${selectedStore.reviewCount === 1 ? "comentário analisado" : "comentários analisados"}`
              : `${stores.length} ${stores.length === 1 ? "loja" : "lojas"} · ${totalComments} comentários`}
          </span>
        </span>
        <ChevronDown
          size={17}
          aria-hidden="true"
          className={`shrink-0 text-muted-foreground transition-transform duration-300 ${isOpen ? "rotate-180 text-evergreen" : "group-hover:text-evergreen"}`}
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 z-40 mt-2 w-full min-w-0 overflow-hidden rounded-[1.15rem] border border-evergreen/15 bg-surface/98 p-1.5 shadow-[0_22px_60px_-24px_rgba(15,48,42,0.45)] backdrop-blur-xl sm:min-w-[27rem]">
          <div className="px-3 pb-2 pt-2">
            <p className="text-[0.62rem] font-extrabold uppercase tracking-[0.15em] text-evergreen">Escolha o escopo da análise</p>
            <p className="mt-1 text-[0.7rem] text-muted-foreground">Compare o consolidado ou aprofunde uma unidade.</p>
          </div>
          <div id={listboxId} role="listbox" aria-label="Estabelecimentos" className="max-h-[min(22rem,60vh)] space-y-1 overflow-y-auto overscroll-contain p-0.5">
            {options.map((option, index) => {
              const isSelected = option.kind === "all" ? selectedId === undefined : option.id === selectedId;
              return (
                <button
                  key={option.id}
                  ref={(element) => { optionRefs.current[index] = element; }}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  tabIndex={index === activeIndex ? 0 : -1}
                  onClick={() => choose(option)}
                  onFocus={() => setActiveIndex(index)}
                  onKeyDown={(event) => handleOptionKeyDown(event, index)}
                  className={`group/option flex w-full min-w-0 items-start gap-3 rounded-xl px-3 py-3 text-left outline-none transition ${isSelected ? "bg-accent/85" : "hover:bg-paper focus-visible:bg-paper"}`}
                >
                  <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${isSelected ? "bg-evergreen text-white" : "bg-paper text-evergreen"}`}>
                    {option.kind === "all" ? <Building2 size={15} aria-hidden="true" /> : <StoreStatusIcon status={option.store.lastMiningStatus} />}
                  </span>
                  {option.kind === "all" ? (
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-black text-ink">Todas as lojas</span>
                      <span className="mt-1 block text-[0.7rem] font-semibold text-muted-foreground">
                        {stores.length} {stores.length === 1 ? "loja" : "lojas"} · {totalComments} comentários · visão consolidada
                      </span>
                    </span>
                  ) : (
                    <span className="min-w-0 flex-1">
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="min-w-0 flex-1 truncate text-sm font-black text-ink" title={option.store.name}>{option.store.name}</span>
                        <StoreStatusLabel status={option.store.lastMiningStatus} />
                      </span>
                      <span className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[0.68rem] font-semibold text-muted-foreground">
                        <span>{option.store.reviewCount} {option.store.reviewCount === 1 ? "comentário" : "comentários"}</span>
                        <span>{Math.round(option.store.satisfactionScore)}% satisfação</span>
                        {option.store.googleRating !== null && (
                          <span className="inline-flex items-center gap-1 text-amber-700"><Star size={11} fill="currentColor" aria-hidden="true" />{formatRating(option.store.googleRating)} no Google</span>
                        )}
                      </span>
                    </span>
                  )}
                  <Check size={16} aria-hidden="true" className={`mt-2 shrink-0 text-evergreen transition-opacity ${isSelected ? "opacity-100" : "opacity-0"}`} />
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function StoreStatusIcon({ status }: { status: EstablishmentSummary["lastMiningStatus"] }) {
  if (status === "COMPLETED") return <CircleCheck size={15} aria-hidden="true" />;
  if (status === "RUNNING") return <LoaderCircle size={15} aria-hidden="true" className="animate-spin" />;
  if (status === "FAILED") return <CircleX size={15} aria-hidden="true" />;
  return <CircleDashed size={15} aria-hidden="true" />;
}

function StoreStatusLabel({ status }: { status: EstablishmentSummary["lastMiningStatus"] }) {
  const styles = status === "COMPLETED"
    ? "bg-emerald-50 text-emerald-700"
    : status === "FAILED"
      ? "bg-red-50 text-red-700"
      : status === "RUNNING"
        ? "bg-blue-50 text-blue-700"
        : "bg-paper text-muted-foreground";
  const label = status === "COMPLETED" ? "Atualizada" : status === "FAILED" ? "Atenção" : status === "RUNNING" ? "Coletando" : status === "QUEUED" ? "Na fila" : "Sem coleta";
  return <span className={`shrink-0 rounded-full px-2 py-0.5 text-[0.58rem] font-extrabold uppercase tracking-[0.08em] ${styles}`}>{label}</span>;
}

function formatRating(value: number) {
  return new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(value);
}
