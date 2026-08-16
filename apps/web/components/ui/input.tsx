import * as React from "react"
import { cn } from "@/lib/utils"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-9 w-full rounded-lg border border-white/10 bg-[#080b14] px-3 py-1 text-sm text-[#f8fafc] shadow-xs transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-[#f8fafc] placeholder:text-[#94a3b8]/50 focus-visible:outline-none focus-visible:border-[#2563eb] focus-visible:ring-1 focus-visible:ring-[#2563eb] disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />

    )
  }
)
Input.displayName = "Input"

export { Input }
