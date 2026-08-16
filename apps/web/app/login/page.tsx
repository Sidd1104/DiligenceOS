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
        <Loader2 className="h-8 w-8 animate-spin text-[#2563eb]" />
      </AuroraBackground>
    );
  }

  return (
    <AuroraBackground className="flex min-h-screen flex-col items-center justify-center p-4">

      <div className="w-full max-w-md space-y-6">
        {/* Branding Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-[#2563eb]/10 text-[#2563eb] border border-[#2563eb]/20 shadow-xs mb-1">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h1 className="text-3xl font-semibold tracking-tight font-heading">DiligenceOS</h1>
          <p className="text-xs text-[#94a3b8] max-w-xs mx-auto">
            Institutional due-diligence & evidence retrieval portal
          </p>
        </div>

        {/* Auth Card */}
        <div className="rounded-2xl border border-white/10 bg-[#131b2e] p-8 shadow-xl backdrop-blur-md space-y-6">
          <div>
            <h2 className="text-lg font-medium text-[#f8fafc]">Log in to your account</h2>
            <p className="text-xs text-[#94a3b8] mt-1">Enter your enterprise credentials below</p>
          </div>

          {error && (
            <div className="rounded-xl bg-[#ef4444]/10 p-3.5 text-xs text-[#ef4444] border border-[#ef4444]/20 flex items-center gap-2">
              <span className="font-semibold">Authentication Error:</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="email" className="block text-xs font-medium text-[#94a3b8]">
                Work Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-[#94a3b8]" />
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="analyst@firm.com"
                  className="w-full rounded-lg border border-white/10 bg-[#080b14] pl-9 pr-3 py-2 text-sm text-[#f8fafc] placeholder:text-[#94a3b8]/50 outline-none focus:border-[#2563eb] focus:ring-1 focus:ring-[#2563eb]"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="block text-xs font-medium text-[#94a3b8]">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-[#94a3b8]" />
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-white/10 bg-[#080b14] pl-9 pr-3 py-2 text-sm text-[#f8fafc] placeholder:text-[#94a3b8]/50 outline-none focus:border-[#2563eb] focus:ring-1 focus:ring-[#2563eb]"
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-10 bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-medium text-sm rounded-lg shadow-sm gap-2 mt-2"
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

          <div className="pt-2 border-t border-white/10 text-center">
            <p className="text-xs text-[#94a3b8]">
              Don&apos;t have an enterprise account?{" "}
              <Link href="/register" className="font-semibold text-[#2563eb] hover:underline">
                Create Account
              </Link>
            </p>
          </div>
        </div>
      </div>
    </AuroraBackground>
  );
}


