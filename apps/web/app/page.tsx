"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Loader2 } from "lucide-react";
import { DiligenceLogo } from "@/components/ui/logo";

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
      <div className="flex flex-col items-center gap-4">
        <DiligenceLogo className="w-14 h-14" textSize="text-2xl" />
        <div className="flex items-center gap-2 text-sm font-medium text-[#9a968c]">
          <Loader2 className="h-4 w-4 animate-spin text-cyan-400" />
          <span>Connecting to DiligenceOS workspace...</span>
        </div>
      </div>
    </div>
  );
}

