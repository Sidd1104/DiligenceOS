"use client";

import React from "react";

interface AuroraBackgroundProps {
  children?: React.ReactNode;
  className?: string;
}

export function AuroraBackground({ children, className = "" }: AuroraBackgroundProps) {
  return (
    <div className={`relative min-h-screen w-full bg-[#0b0f19] text-[#f8fafc] overflow-hidden ${className}`}>
      {/* Ambient Moving Aurora Glow Blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {/* Blob 1: Sapphire Blue Drift */}
        <div className="absolute -top-[20%] -left-[10%] h-[600px] w-[600px] rounded-full bg-gradient-to-tr from-[#2563eb]/20 via-[#1d4ed8]/15 to-transparent blur-[120px] animate-aurora-slow" />
        
        {/* Blob 2: Emerald Growth Drift */}
        <div className="absolute top-[30%] -right-[15%] h-[550px] w-[550px] rounded-full bg-gradient-to-br from-[#10b981]/15 via-[#059669]/10 to-transparent blur-[130px] animate-aurora-reverse" />
        
        {/* Blob 3: Deep Sub-surface Sapphire Pool */}
        <div className="absolute -bottom-[20%] left-[20%] h-[650px] w-[650px] rounded-full bg-[#1e40af]/15 blur-[140px] animate-aurora-pulse" />

        {/* Sparse Subtle Starfield Overlay */}
        <div
          className="absolute inset-0 opacity-40 mix-blend-screen"
          style={{
            backgroundImage: `radial-gradient(rgba(255, 255, 255, 0.12) 1px, transparent 1px)`,
            backgroundSize: "32px 32px",
          }}
        />
      </div>

      {/* Content Container */}
      <div className="relative z-10">{children}</div>
    </div>
  );
}
