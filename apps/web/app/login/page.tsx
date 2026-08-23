"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { ShieldCheck, ArrowRight, Lock, Mail, Loader2 } from "lucide-react";
import { AuroraBackground } from "@/components/ui/aurora-background";

export default function LoginPage() {
  const { user, loading, login } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      router.push("/dashboard");
    }
  }, [user, loading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await login(email, password);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Invalid email or password");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <AuroraBackground className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#d4af6a]" />
      </AuroraBackground>
    );
  }

  return (
    <AuroraBackground className="flex min-h-screen flex-col items-center justify-center p-4">

      <div className="w-full max-w-md space-y-6">
        {/* Branding Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-[rgba(212,175,106,0.14)] text-[#d4af6a] border border-[rgba(212,175,106,0.28)] shadow-xs mb-1">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h1 className="text-3xl font-semibold tracking-tight font-heading">DiligenceOS</h1>
          <p className="text-xs text-[#9a968c] max-w-xs mx-auto">
            Institutional due-diligence & evidence retrieval portal
          </p>
        </div>

        {/* Auth Card */}
        <div className="rounded-2xl border border-[rgba(245,243,239,0.08)] bg-[rgba(21,21,28,0.9)] p-8 shadow-xl backdrop-blur-xl space-y-6">
          <div>
            <h2 className="text-lg font-medium text-[#f5f3ef]">Log in to your account</h2>
            <p className="text-xs text-[#9a968c] mt-1">Enter your enterprise credentials below</p>
          </div>

          {error && (
            <div className="rounded-xl bg-[#ef4444]/10 p-3.5 text-xs text-[#ef4444] border border-[#ef4444]/20 flex items-center gap-2">
              <span className="font-semibold">Authentication Error:</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="email" className="block text-[11px] font-medium text-[#9a968c] uppercase tracking-wider">
                Work Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-[#9a968c]" />
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@fund.com"
                  className="w-full rounded-lg border border-[rgba(245,243,239,0.08)] bg-[#0d0d11] pl-9 pr-3 py-2.5 text-sm text-[#f5f3ef] placeholder:text-[#9a968c]/50 outline-none focus:border-[#d4af6a] focus:ring-1 focus:ring-[#d4af6a] transition-colors"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="block text-[11px] font-medium text-[#9a968c] uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-[#9a968c]" />
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-[rgba(245,243,239,0.08)] bg-[#0d0d11] pl-9 pr-3 py-2.5 text-sm text-[#f5f3ef] placeholder:text-[#9a968c]/50 outline-none focus:border-[#d4af6a] focus:ring-1 focus:ring-[#d4af6a] transition-colors"
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-10 text-sm rounded-lg shadow-sm gap-2 mt-2"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Authenticating...
                </>
              ) : (
                <>
                  Log in to Workspace
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          <div className="pt-2 border-t border-[rgba(245,243,239,0.08)] text-center">
            <p className="text-xs text-[#9a968c]">
              No workspace yet?{" "}
              <Link href="/register" className="font-semibold text-[#d4af6a] hover:underline">
                Create one
              </Link>
            </p>
          </div>
        </div>
      </div>
    </AuroraBackground>
  );
}
