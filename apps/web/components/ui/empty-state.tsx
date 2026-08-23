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
        "flex flex-col items-center justify-center text-center p-8 rounded-xl border border-[rgba(245,243,239,0.08)] bg-[#15151c]/85 backdrop-blur-md min-h-[240px]",
        className
      )}
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-[rgba(212,175,106,0.14)] text-[#d4af6a] border border-[rgba(212,175,106,0.28)] shadow-xs mb-5">
        <Icon className="h-7 w-7" />
      </div>
      <h3 className="text-lg font-semibold text-[#f5f3ef] font-heading tracking-tight">
        {title}
      </h3>
      <p className="text-xs text-[#9a968c] max-w-sm mt-1 mb-6 leading-relaxed">
        {description}
      </p>
      {actionLabel && (
        <div>
          {actionHref ? (
            <a href={actionHref}>
              <Button className="h-9 px-5 text-xs font-semibold rounded-lg transition-all duration-150">
                {actionLabel}
              </Button>
            </a>
          ) : (
            <Button
              onClick={onAction}
              className="h-9 px-5 text-xs font-semibold rounded-lg transition-all duration-150"
            >
              {actionLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
