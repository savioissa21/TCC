import * as React from "react"
import { cn } from "../../lib/utils"
import { Loader2 } from "lucide-react"

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  isLoading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", isLoading, children, disabled, ...props }, ref) => {
    
    const baseStyles = "inline-flex min-h-11 items-center justify-center whitespace-nowrap rounded-xl text-sm font-bold tracking-[-0.01em] ring-offset-background transition duration-300 ease-editorial focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:translate-y-px disabled:pointer-events-none disabled:opacity-50";

    const variants = {
      default: "bg-ink text-surface shadow-editorial hover:-translate-y-0.5 hover:bg-ink/92 hover:shadow-lift",
      destructive: "bg-destructive text-destructive-foreground shadow-sm hover:-translate-y-0.5 hover:bg-destructive/92",
      outline: "border border-input bg-surface/80 text-ink shadow-sm hover:-translate-y-0.5 hover:border-evergreen/40 hover:bg-accent",
      secondary: "bg-secondary text-secondary-foreground hover:-translate-y-0.5 hover:bg-secondary/75",
      ghost: "text-ink hover:bg-accent hover:text-accent-foreground",
      link: "min-h-0 text-evergreen underline-offset-4 hover:underline",
    };

    const sizes = {
      default: "px-4 py-2.5",
      sm: "min-h-9 rounded-lg px-3 py-1.5 text-xs",
      lg: "min-h-12 px-8 py-3 text-base",
      icon: "h-11 w-11 px-0",
    };

    return (
      <button
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        ref={ref}
        disabled={isLoading || disabled}
        {...props}
      >
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {children}
      </button>
    )
  }
)
Button.displayName = "Button"

export { Button }
