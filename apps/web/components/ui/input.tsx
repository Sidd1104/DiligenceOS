import * as React from "react"
import { cn } from "@/lib/utils"

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-9 w-full rounded-lg border border-[rgba(245,243,239,0.08)] bg-[#0d0d11] px-3 py-1 text-sm text-[#f5f3ef] shadow-xs transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-[#f5f3ef] placeholder:text-[#9a968c]/50 focus-visible:outline-none focus-visible:border-[#d4af6a] focus-visible:ring-1 focus-visible:ring-[#d4af6a] disabled:cursor-not-allowed disabled:opacity-50",
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
