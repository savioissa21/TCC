import { Star, MapPin } from "lucide-react";
import { useId, useLayoutEffect, useRef, useState } from "react";
import { cn } from "../../lib/utils";
import { type Review } from "../../types";

interface ReviewCardProps {
  review: Review;
}

const sentimentStyle = {
  Positivo: "bg-green-50 text-green-700 ring-green-600/20",
  Negativo: "bg-red-50 text-red-700 ring-red-600/20",
  Neutro: "bg-slate-50 text-slate-600 ring-slate-500/10",
};

const aspectColor = {
  Positivo: "text-green-600",
  Negativo: "text-red-500",
  Neutro: "text-slate-500",
};

const aspectDot = {
  Positivo: "bg-green-500",
  Negativo: "bg-red-500",
  Neutro: "bg-slate-400",
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
    <article className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md sm:p-5">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-slate-700 to-slate-950 text-sm font-bold text-white shadow-sm">
          {initials}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
            <div className="flex min-w-0 items-center gap-2">
              <span className="truncate text-sm font-bold text-slate-900">{review.author || "Cliente anônimo"}</span>
              <span
                className={cn(
                  "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset",
                  sentimentStyle[sentiment] ?? sentimentStyle.Neutro
                )}
              >
                {review.overallSentiment}
              </span>
            </div>
            <span className="flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full bg-slate-50 px-2 py-1 text-[11px] text-slate-400">
              <MapPin size={10} aria-hidden="true" />
              {review.date}
            </span>
          </div>

          {review.establishmentName && <p className="mt-1 truncate text-xs font-medium text-slate-500">{review.establishmentName}</p>}
          {/* Stars */}
          <div className="mt-1.5 flex items-center gap-0.5" aria-label={`Nota ${review.rating?.toFixed(1)} de 5`}>
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                size={12}
                aria-hidden="true"
                className={cn(i < review.rating ? "text-yellow-400 fill-yellow-400" : "text-slate-200 fill-slate-200")}
              />
            ))}
            <span className="ml-1.5 text-xs font-semibold text-slate-500">{review.rating?.toFixed(1)}</span>
          </div>
        </div>
      </div>

      {/* Texto */}
      <p ref={textRef} id={textId}
        className={cn("mt-4 text-sm leading-6 text-slate-600 sm:pl-[52px]", !expanded && "line-clamp-3")}>
        "{review.text}"
      </p>
      {canExpand && (
        <button type="button" aria-expanded={expanded} aria-controls={textId}
          onClick={() => setExpanded(value => !value)}
          className="mt-1.5 rounded text-xs font-semibold text-indigo-600 underline decoration-indigo-200 underline-offset-4 hover:text-indigo-800 sm:ml-[52px]">
          {expanded ? "Ler menos" : "Ler avaliação completa"}
        </button>
      )}

      {/* Aspectos */}
      {review.aspects && review.aspects.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4 sm:pl-[52px]">
          {aspects.map((aspect) => (
            <span
              key={`${aspect.name}|${aspect.sentiment}`}
              title={Array.from(aspect.excerpts).filter(Boolean).join("\n")}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-50 px-2.5 py-1.5 text-xs ring-1 ring-inset ring-slate-200"
            >
              <span className={cn("h-1.5 w-1.5 rounded-full", aspectDot[aspect.sentiment as keyof typeof aspectDot] || "bg-slate-400")} />
              <span className="font-medium text-slate-600">{aspect.name}:</span>
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
