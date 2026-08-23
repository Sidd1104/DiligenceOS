"use client";

import React from "react";

interface AuroraBackgroundProps {
  children?: React.ReactNode;
  className?: string;
}

/**
 * Wrapper for auth screens (login/register).
 * The starfield background is now rendered globally in layout.tsx,
 * so this component simply provides the positioning container.
 */
export function AuroraBackground({ children, className = "" }: AuroraBackgroundProps) {
  return (
    <div className={`relative min-h-screen w-full bg-transparent text-[#f5f3ef] overflow-hidden ${className}`}>
      <div className="relative z-10">{children}</div>
    </div>
  );
}
