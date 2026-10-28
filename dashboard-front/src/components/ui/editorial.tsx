import type { ElementType, HTMLAttributes, ReactNode } from "react";
import { cn } from "../../lib/utils";

export type EditorialLabelProps = HTMLAttributes<HTMLParagraphElement>;

export type SurfaceProps = HTMLAttributes<HTMLElement> & {
  as?: ElementType;
};

export type MetricPanelProps = {
  label: string;
  value: ReactNode;
  detail?: ReactNode;
  icon?: ReactNode;
  tone?: "default" | "positive" | "warning" | "danger";
  className?: string;
};

export function EditorialLabel({ className, ...props }: EditorialLabelProps) {
  return (
    <p
      className={cn("text-[0.68rem] font-extrabold uppercase tracking-[0.18em] text-evergreen", className)}
      {...props}
    />
  );
}

export function Surface({ as: Component = "div", className, ...props }: SurfaceProps) {
  return (
    <Component
      className={cn("rounded-[1.1rem] border border-border/90 bg-surface/90 shadow-editorial backdrop-blur-sm", className)}
      {...props}
    />
  );
}

const toneStyles = {
  default: "border-border/90 bg-surface text-ink",
  positive: "border-emerald-200/80 bg-emerald-50/80 text-emerald-950",
  warning: "border-amber-200/80 bg-amber-50/80 text-amber-950",
  danger: "border-red-200/80 bg-red-50/80 text-red-950",
};

export function MetricPanel({ label, value, detail, icon, tone = "default", className }: MetricPanelProps) {
  return (
    <article
      role="group"
      aria-label={label}
      className={cn(
        "group relative min-h-36 overflow-hidden rounded-[1.1rem] border p-5 shadow-editorial transition duration-300 ease-editorial hover:-translate-y-0.5 hover:shadow-lift",
        toneStyles[tone],
        className,
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <p className="text-xs font-bold uppercase tracking-[0.1em] opacity-65">{label}</p>
        {icon && <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-current/10 bg-white/60 opacity-75">{icon}</span>}
      </div>
      <div className="mt-5 text-3xl font-extrabold tracking-[-0.045em] sm:text-4xl">{value}</div>
      {detail && <div className="mt-2 text-xs leading-relaxed opacity-65">{detail}</div>}
    </article>
  );
}
