import * as React from "react"
import { cn } from "../../lib/utils"

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, label, error, icon, ...props }, ref) => {
    return (
      <div className="w-full space-y-2">
        {label && (
          <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-foreground">
            {label}
          </label>
        )}
        <div className="relative">
          <input
            type={type}
            className={cn(
              // Base Layout
              "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2",
              // Typography (Mobile Friendly: text-base evita zoom no iOS)
              "text-base md:text-sm text-foreground ring-offset-background",
              // File input styles
              "file:border-0 file:bg-transparent file:text-sm file:font-medium",
              // Placeholder
              "placeholder:text-muted-foreground",
              // Focus & Transition
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 transition-all duration-200",
              // Disabled
              "disabled:cursor-not-allowed disabled:opacity-50",
              // Error State
              error && "border-destructive focus-visible:ring-destructive",
              // Icon Padding
              icon && "pl-10",
              className
            )}
            ref={ref}
            {...props}
          />
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
              {icon}
            </div>
          )}
        </div>
        {error && <p className="text-xs text-destructive font-medium animate-in slide-in-from-top-1">{error}</p>}
      </div>
    )
  }
)
Input.displayName = "Input"

export { Input }