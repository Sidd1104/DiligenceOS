"use client";

import React, { useEffect, useRef } from "react";

interface Star {
  x: number;
  y: number;
  r: number;
  baseAlpha: number;
  sp: number;
  ph: number;
}

interface ShootingStar {
  x: number;
  y: number;
  len: number;
  maxLen: number;
  vx: number;
  vy: number;
  alpha: number;
}

/**
 * Full-viewport canvas starfield background.
 * Twinkling stars (opacity oscillating via sine wave per star)
 * plus occasional shooting stars (gold-tinted fading trail).
 *
 * Re-checks canvas.clientWidth/clientHeight every frame to handle
 * resize without relying on window resize events alone.
 */
export function Starfield() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = 0;
    let h = 0;
    let stars: Star[] = [];
    let shooting: ShootingStar[] = [];
    let animId: number;

    function seedStars() {
      stars = [];
      for (let i = 0; i < 220; i++) {
        stars.push({
          x: Math.random() * w,
          y: Math.random() * h,
          r: Math.random() * 1.3 + 0.3,
          baseAlpha: Math.random() * 0.5 + 0.2,
          sp: Math.random() * 0.02 + 0.005,
          ph: Math.random() * Math.PI * 2,
        });
      }
    }

    // Re-check the canvas's ACTUAL rendered box size every frame and
    // resync the drawing buffer to match. This is deliberately more
    // aggressive than listening for a 'resize' event, because some
    // environments never fire a window resize event at all — checking
    // the real layout size every frame guarantees the canvas can never
    // get stuck at a stale, smaller measurement.
    function ensureSize() {
      if (!canvas) return;
      const cw =
        canvas.clientWidth ||
        window.innerWidth ||
        document.documentElement.clientWidth;
      const ch =
        canvas.clientHeight ||
        window.innerHeight ||
        document.documentElement.clientHeight;
      if (cw > 0 && ch > 0 && (cw !== w || ch !== h)) {
        w = canvas.width = cw;
        h = canvas.height = ch;
        seedStars();
      }
    }

    function draw(t: number) {
      if (!ctx || !canvas) return;
      ensureSize();
      ctx.clearRect(0, 0, w, h);

      // Twinkling stars
      stars.forEach((s) => {
        const a = s.baseAlpha + Math.sin(t * s.sp + s.ph) * 0.25;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(245,243,239,${Math.max(0, a)})`;
        ctx.fill();
      });

      // Occasional shooting stars
      if (Math.random() < 0.007 && shooting.length < 2) {
        shooting.push({
          x: Math.random() * w * 0.6 + w * 0.2,
          y: Math.random() * h * 0.3,
          len: 0,
          maxLen: 130 + Math.random() * 90,
          vx: 4 + Math.random() * 3,
          vy: 2 + Math.random() * 2,
          alpha: 1,
        });
      }

      shooting.forEach((s) => {
        s.x += s.vx;
        s.y += s.vy;
        s.len = Math.min(s.maxLen, s.len + 8);
        s.alpha -= 0.011;
        const g = ctx.createLinearGradient(
          s.x,
          s.y,
          s.x - s.len * (s.vx / 6),
          s.y - s.len * (s.vy / 6)
        );
        g.addColorStop(
          0,
          `rgba(212,175,106,${Math.max(0, s.alpha)})`
        );
        g.addColorStop(1, "rgba(212,175,106,0)");
        ctx.strokeStyle = g;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(
          s.x - s.len * (s.vx / 6),
          s.y - s.len * (s.vy / 6)
        );
        ctx.stroke();
      });

      shooting = shooting.filter((s) => s.alpha > 0);
      animId = requestAnimationFrame(draw);
    }

    ensureSize();
    animId = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animId);
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-0 pointer-events-none overflow-hidden"
      aria-hidden="true"
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full block"
      />
    </div>
  );
}
