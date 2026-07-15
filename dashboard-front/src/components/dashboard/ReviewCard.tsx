import { Star, MapPin } from "lucide-react";
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

export function ReviewCard({ review }: ReviewCardProps) {
  const initials = review.author
    ? review.author.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase()
    : "?";

  const sentiment = (review.overallSentiment as keyof typeof sentimentStyle) || "Neutro";

  return (
    <div className="group rounded-xl border border-slate-200 bg-white p-4 hover:border-slate-300 hover:shadow-md transition-all duration-200">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-slate-700 to-slate-900 text-white text-sm font-bold">
          {initials}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-slate-900 truncate">{review.author}</span>
              <span
                className={cn(
                  "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset",
                  sentimentStyle[sentiment] ?? sentimentStyle.Neutro
                )}
              >
                {review.overallSentiment}
              </span>
            </div>
            <span className="text-xs text-slate-400 whitespace-nowrap flex items-center gap-1">
              <MapPin size={10} />
              {review.date}
            </span>
          </div>

          {/* Stars */}
          <div className="flex items-center gap-0.5 mt-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                size={12}
                className={cn(i < review.rating ? "text-yellow-400 fill-yellow-400" : "text-slate-200 fill-slate-200")}
              />
            ))}
            <span className="ml-1.5 text-xs text-slate-400">{review.rating?.toFixed(1)}</span>
          </div>
        </div>
      </div>

      {/* Texto */}
      <p className="mt-3 text-sm text-slate-600 leading-relaxed line-clamp-3 pl-[52px]">"{review.text}"</p>

      {/* Aspectos */}
      {review.aspects && review.aspects.length > 0 && (
        <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap gap-2 pl-[52px]">
          {review.aspects.map((aspect, idx) => (
            <span
              key={idx}
              className="inline-flex items-center gap-1 rounded-md bg-slate-50 px-2 py-1 text-xs ring-1 ring-inset ring-slate-200"
            >
              <span className="text-slate-600 font-medium">{aspect.name}:</span>
              <span className={cn("font-bold", aspectColor[aspect.sentiment as keyof typeof aspectColor] || "text-slate-500")}>
                {aspect.sentiment}
              </span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
