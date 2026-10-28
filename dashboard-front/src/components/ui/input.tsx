import * as React from "react"
import { cn } from "../../lib/utils"

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, label, error, icon, ...props }, ref) => {
    const generatedId = React.useId();
    const id = props.id || generatedId;
    return (
      <div className="w-full space-y-2.5">
        {label && (
          <label htmlFor={id} className="text-xs font-bold uppercase tracking-[0.08em] text-foreground/75 peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            {label}
          </label>
        )}
        <div className="relative">
          <input
            type={type}
            className={cn(
              "flex h-12 w-full rounded-xl border border-input bg-surface/80 px-3 py-2 shadow-sm",
              "text-base text-foreground ring-offset-background md:text-sm",
              "file:border-0 file:bg-transparent file:text-sm file:font-medium",
              "placeholder:text-muted-foreground",
              "transition duration-300 ease-editorial hover:border-evergreen/40 focus-visible:border-evergreen focus-visible:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 focus-visible:ring-offset-2",
              "disabled:cursor-not-allowed disabled:opacity-50",
              error && "border-destructive focus-visible:ring-destructive",
              icon && "pl-10",
              className
            )}
            ref={ref}
            {...props}
            id={id}
            aria-invalid={Boolean(error) || props["aria-invalid"]}
            aria-describedby={error ? `${id}-error` : props["aria-describedby"]}
          />
          {icon && (
            <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              {icon}
            </div>
          )}
        </div>
        {error && <p id={`${id}-error`} role="alert" className="text-xs font-semibold text-destructive animate-in slide-in-from-top-1">{error}</p>}
      </div>
    )
  }
)
Input.displayName = "Input"

export { Input }
