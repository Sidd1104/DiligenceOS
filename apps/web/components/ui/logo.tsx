"use client";

import React from "react";

export function DiligenceLogo({
  className = "w-8 h-8",
  showText = true,
  textSize = "text-xl",
}: {
  className?: string;
  showText?: boolean;
  textSize?: string;
}) {
  return (
    <div className="inline-flex items-center gap-2.5 group">
      <div className={`relative flex items-center justify-center shrink-0 ${className}`}>
        {/* Ambient Neon Glow */}
        <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 rounded-2xl blur-md opacity-40 group-hover:opacity-85 transition duration-500"></div>

        {/* Dark Shielded Magnifying Glass SVG Symbol */}
        <svg
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="relative w-full h-full drop-shadow-[0_0_12px_rgba(56,189,248,0.5)]"
        >
          <defs>
            <linearGradient id="shield-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#00f2fe" />
              <stop offset="50%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#6366f1" />
            </linearGradient>
            <linearGradient id="shield-bg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0b0f19" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#111827" stopOpacity="0.9" />
            </linearGradient>
            <linearGradient id="glass-lens" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#6366f1" stopOpacity="0.1" />
            </linearGradient>
          </defs>

          {/* Shield Base Shape */}
          <path
            d="M50 8 L88 23 C88 58 68 82 50 92 C32 82 12 58 12 23 Z"
            fill="url(#shield-bg)"
            stroke="url(#shield-gradient)"
            strokeWidth="4.5"
            strokeLinejoin="round"
          />

          {/* Inner Shield Bezel Line */}
          <path
            d="M50 14 L82 27 C82 55 65 76 50 85"
            stroke="url(#shield-gradient)"
            strokeWidth="1.5"
            strokeOpacity="0.35"
            fill="none"
          />

          {/* Magnifying Glass Lens Outer Ring */}
          <circle
            cx="50"
            cy="44"
            r="20"
            fill="url(#glass-lens)"
            stroke="url(#shield-gradient)"
            strokeWidth="5"
          />

          {/* Lens Glare Curve */}
          <path
            d="M40 32 A 14 14 0 0 1 58 32"
            stroke="#ffffff"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeOpacity="0.65"
          />

          {/* Magnifying Glass Handle (Diagonally extending) */}
          <path
            d="M36 58 L24 70 C22 72 22 75 24 77 L25 78 C27 80 30 80 32 78 L44 66"
            fill="url(#shield-gradient)"
            stroke="url(#shield-gradient)"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Handle Grip Detail */}
          <line x1="28" y1="74" x2="31" y2="71" stroke="#0b0f19" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      </div>

      {showText && (
        <span className={`font-display font-bold tracking-tight text-white ${textSize}`}>
          Diligence<span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400">OS</span>
        </span>
      )}
    </div>
  );
}
