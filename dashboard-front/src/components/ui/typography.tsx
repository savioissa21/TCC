// src/components/ui/typography.tsx
import React from "react";
import { cn } from "../../lib/utils";

type TypographyProps = {
  as?: React.ElementType;
  variant?: "h1" | "h2" | "h3" | "h4" | "p" | "muted" | "small" | "lead";
  children: React.ReactNode;
  className?: string;
} & React.HTMLAttributes<HTMLElement>;

export function Typography({ as, variant = "p", className, children, ...props }: TypographyProps) {
  const Component = as || (variant === "p" || variant === "muted" || variant === "lead" ? "p" : variant);
  
  const styles = {
    h1: "scroll-m-20 text-4xl font-extrabold tracking-[-0.05em] text-ink lg:text-5xl",
    h2: "scroll-m-20 border-b border-border pb-2 text-3xl font-extrabold tracking-[-0.04em] text-ink first:mt-0",
    h3: "scroll-m-20 text-2xl font-extrabold tracking-[-0.035em] text-ink",
    h4: "scroll-m-20 text-xl font-bold tracking-[-0.025em] text-ink",
    p: "leading-7 text-foreground [&:not(:first-child)]:mt-6",
    lead: "text-xl leading-relaxed text-foreground/75",
    muted: "text-sm leading-relaxed text-muted-foreground",
    small: "text-sm font-semibold leading-none text-foreground"
  };

  return (
    <Component className={cn(styles[variant], className)} {...props}>
      {children}
    </Component>
  );
}
