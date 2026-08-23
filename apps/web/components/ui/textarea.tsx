import * as React from "react"
import { cn } from "@/lib/utils"

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[80px] w-full rounded-lg border border-[rgba(245,243,239,0.08)] bg-[#0d0d11] px-3 py-2 text-sm text-[#f5f3ef] shadow-xs transition-colors placeholder:text-[#9a968c]/50 focus-visible:outline-none focus-visible:border-[#d4af6a] focus-visible:ring-1 focus-visible:ring-[#d4af6a] disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Textarea.displayName = "Textarea"

export { Textarea }
