import { Star, MapPin, Quote } from "lucide-react";
import { useId, useLayoutEffect, useRef, useState } from "react";
import { cn } from "../../lib/utils";
import { type Review } from "../../types";

interface ReviewCardProps {
  review: Review;
}

const sentimentStyle = {
  Positivo: "bg-emerald-50 text-emerald-800 ring-emerald-700/15",
  Negativo: "bg-red-50 text-red-800 ring-red-700/15",
  Neutro: "bg-slate-100 text-slate-700 ring-slate-600/10",
};

const aspectColor = {
  Positivo: "text-emerald-700",
  Negativo: "text-red-700",
  Neutro: "text-slate-600",
};

const aspectDot = {
  Positivo: "bg-emerald-600",
  Negativo: "bg-red-600",
  Neutro: "bg-slate-500",
};

export function ReviewCard({ review }: ReviewCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [canExpand, setCanExpand] = useState(false);
  const textRef = useRef<HTMLParagraphElement>(null);
  const textId = useId();

  useLayoutEffect(() => {
    if (expanded || !textRef.current) return;
    const text = textRef.current;
    const measure = () => setCanExpand(text.scrollHeight > text.clientHeight + 1);
    measure();

    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(measure);
      observer.observe(text);
      return () => observer.disconnect();
    }

    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [expanded, review.text]);
  // Multiple excerpts are evidence of the same polarity, not separate badges.
  // Preserve opposing polarities instead of hiding mixed opinions.
  const aspects = Array.from((review.aspects ?? []).reduce((groups, aspect) => {
    const key = `${aspect.name.trim().toLocaleLowerCase()}|${aspect.sentiment.trim().toLocaleLowerCase()}`;
    const existing = groups.get(key);
    if (existing) existing.excerpts.add(aspect.excerpt);
    else groups.set(key, { ...aspect, excerpts: new Set([aspect.excerpt]) });
    return groups;
  }, new Map<string, Review["aspects"][number] & { excerpts: Set<string> }>()).values());
  const initials = review.author
    ? review.author.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase()
    : "?";

  const sentiment = (review.overallSentiment as keyof typeof sentimentStyle) || "Neutro";

  return (
    <article className="group relative overflow-hidden rounded-[1.1rem] border border-border/90 bg-surface/92 p-4 shadow-editorial transition duration-300 ease-editorial hover:-translate-y-0.5 hover:border-evergreen/25 hover:shadow-lift sm:p-5">
      <Quote size={54} className="pointer-events-none absolute -right-2 -top-2 text-evergreen/[0.045]" aria-hidden="true" />
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ink text-sm font-black text-surface shadow-sm">
          {initials}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
            <div className="flex min-w-0 items-center gap-2">
              <span className="truncate text-sm font-black text-ink">{review.author || "Cliente anônimo"}</span>
              <span
                className={cn(
                  "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset",
                  sentimentStyle[sentiment] ?? sentimentStyle.Neutro
                )}
              >
                {review.overallSentiment}
              </span>
            </div>
            <span className="flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full bg-paper px-2 py-1 text-[11px] text-muted-foreground">
              <MapPin size={10} aria-hidden="true" />
              {review.date}
            </span>
          </div>

          {review.establishmentName && <p className="mt-1 truncate text-xs font-semibold text-muted-foreground">{review.establishmentName}</p>}
          {/* Stars */}
          <div className="mt-1.5 flex items-center gap-0.5" aria-label={`Nota ${review.rating?.toFixed(1)} de 5`}>
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                size={12}
                aria-hidden="true"
                className={cn(i < review.rating ? "fill-amber-400 text-amber-400" : "fill-stone-200 text-stone-200")}
              />
            ))}
            <span className="ml-1.5 text-xs font-bold text-muted-foreground">{review.rating?.toFixed(1)}</span>
          </div>
        </div>
      </div>

      {/* Texto */}
      <p ref={textRef} id={textId}
        className={cn("mt-4 text-sm leading-6 text-foreground/75 sm:pl-[52px]", !expanded && "line-clamp-3")}>
        "{review.text}"
      </p>
      {canExpand && (
        <button type="button" aria-expanded={expanded} aria-controls={textId}
          onClick={() => setExpanded(value => !value)}
          className="mt-1.5 rounded text-xs font-bold text-evergreen underline decoration-evergreen/25 underline-offset-4 hover:text-ink sm:ml-[52px]">
          {expanded ? "Ler menos" : "Ler avaliação completa"}
        </button>
      )}

      {/* Aspectos */}
      {review.aspects && review.aspects.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2 border-t border-border/70 pt-4 sm:pl-[52px]">
          {aspects.map((aspect) => (
            <span
              key={`${aspect.name}|${aspect.sentiment}`}
              title={Array.from(aspect.excerpts).filter(Boolean).join("\n")}
              className="inline-flex items-center gap-1.5 rounded-lg bg-paper/75 px-2.5 py-1.5 text-xs ring-1 ring-inset ring-border"
            >
              <span className={cn("h-1.5 w-1.5 rounded-full", aspectDot[aspect.sentiment as keyof typeof aspectDot] || "bg-slate-400")} />
              <span className="font-semibold text-foreground/70">{aspect.name}:</span>
              <span className={cn("font-bold", aspectColor[aspect.sentiment as keyof typeof aspectColor] || "text-slate-500")}>
                {aspect.sentiment}
              </span>
            </span>
          ))}
        </div>
      )}
    </article>
  );
}
