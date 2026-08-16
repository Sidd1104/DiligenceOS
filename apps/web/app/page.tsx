"use client";

import { useEffect, useState } from "react";

type HealthStatus = {
  status: string;
} | null;

export default function Home() {
  const [health, setHealth] = useState<HealthStatus>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

    fetch(`${apiUrl}/api/v1/health`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        setHealth(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 p-8">
      {/* Logo / Title */}
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight">
          DiligenceOS
        </h1>
        <p className="mt-2 text-muted-foreground">
          AI-powered due-diligence platform
        </p>
      </div>

      {/* Health Check Card */}
      <div className="w-full max-w-md rounded-xl border bg-card p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold">API Health Check</h2>

        {loading && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <div className="h-3 w-3 animate-pulse rounded-full bg-yellow-400" />
            <span>Connecting to API...</span>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 text-destructive">
            <div className="h-3 w-3 rounded-full bg-red-500" />
            <span>Error: {error}</span>
          </div>
        )}

        {health && (
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-green-500" />
            <span className="font-medium">
              Status: <code className="rounded bg-muted px-1.5 py-0.5 text-sm">{health.status}</code>
            </span>
          </div>
        )}

        <p className="mt-4 text-xs text-muted-foreground">
          Fetching from{" "}
          <code className="rounded bg-muted px-1 py-0.5">
            {process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/v1/health
          </code>
        </p>
      </div>

      {/* Service Info */}
      <div className="grid w-full max-w-md grid-cols-2 gap-3">
        <div className="rounded-lg border bg-card p-4 text-center">
          <p className="text-xs text-muted-foreground">Frontend</p>
          <p className="mt-1 text-sm font-medium">Next.js + shadcn/ui</p>
        </div>
        <div className="rounded-lg border bg-card p-4 text-center">
          <p className="text-xs text-muted-foreground">Backend</p>
          <p className="mt-1 text-sm font-medium">FastAPI + PostgreSQL</p>
        </div>
      </div>
    </main>
  );
}
