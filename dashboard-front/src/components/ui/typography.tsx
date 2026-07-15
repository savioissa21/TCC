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
    h1: "scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl",
    h2: "scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight first:mt-0",
    h3: "scroll-m-20 text-2xl font-semibold tracking-tight",
    h4: "scroll-m-20 text-xl font-semibold tracking-tight",
    p: "leading-7 [&:not(:first-child)]:mt-6 text-slate-900 dark:text-slate-100",
    lead: "text-xl text-slate-700 dark:text-slate-300",
    muted: "text-sm text-slate-500 dark:text-slate-400",
    small: "text-sm font-medium leading-none"
  };

  return (
    <Component className={cn(styles[variant], className)} {...props}>
      {children}
    </Component>
  );
}