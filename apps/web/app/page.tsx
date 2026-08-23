"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Loader2, ShieldCheck } from "lucide-react";

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (user) {
        router.replace("/dashboard");
      } else {
        router.replace("/login");
      }
    }
  }, [user, loading, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-transparent text-[#f5f3ef]">
      <div className="flex flex-col items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[rgba(212,175,106,0.14)] text-[#d4af6a] border border-[rgba(212,175,106,0.28)]">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <div className="flex items-center gap-2 text-sm font-medium text-[#9a968c]">
          <Loader2 className="h-4 w-4 animate-spin text-[#d4af6a]" />
          <span>Connecting to DiligenceOS workspace...</span>
        </div>
      </div>
    </div>
  );
}
