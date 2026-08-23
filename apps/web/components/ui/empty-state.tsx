import React from "react";
import { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  actionHref?: string;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  actionHref,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center p-8 rounded-xl border border-white/10 bg-[#131b2e]/50 backdrop-blur-md min-h-[240px]",
        className
      )}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#2563eb]/10 text-[#2563eb] border border-[#2563eb]/20 shadow-xs mb-4">
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="text-base font-semibold text-[#f8fafc] font-heading tracking-tight">
        {title}
      </h3>
      <p className="text-xs text-[#94a3b8] max-w-sm mt-1 mb-6 leading-relaxed">
        {description}
      </p>
      {actionLabel && (
        <div>
          {actionHref ? (
            <a href={actionHref}>
              <Button className="h-9 px-4 text-xs font-medium bg-[#2563eb] hover:bg-[#1d4ed8] text-white shadow-xs rounded-lg transition-all duration-150">
                {actionLabel}
              </Button>
            </a>
          ) : (
            <Button
              onClick={onAction}
              className="h-9 px-4 text-xs font-medium bg-[#2563eb] hover:bg-[#1d4ed8] text-white shadow-xs rounded-lg transition-all duration-150"
            >
              {actionLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
