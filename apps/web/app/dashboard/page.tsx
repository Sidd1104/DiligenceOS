"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";

export default function DashboardPage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading dashboard...</p>
      </div>
    );
  }

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b pb-4">
          <div>
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <p className="text-sm text-muted-foreground">
              DiligenceOS Analyst Workspace
            </p>
          </div>

          <Button variant="outline" onClick={handleLogout}>
            Logout
          </Button>
        </div>

        {/* User Card */}
        <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-4 w-4 rounded-full bg-green-500" />
            <p className="text-lg font-medium">
              Logged in as <code className="rounded bg-muted px-2 py-0.5">{user.email}</code>
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="rounded-lg border bg-muted/30 p-4">
              <p className="text-xs text-muted-foreground font-medium">User ID</p>
              <p className="text-sm font-mono mt-1 break-all">{user.id}</p>
            </div>

            <div className="rounded-lg border bg-muted/30 p-4">
              <p className="text-xs text-muted-foreground font-medium">Workspace ID</p>
              <p className="text-sm font-mono mt-1 break-all">
                {user.workspace_id || "None"}
              </p>
            </div>

            {user.full_name && (
              <div className="rounded-lg border bg-muted/30 p-4 md:col-span-2">
                <p className="text-xs text-muted-foreground font-medium">Full Name</p>
                <p className="text-sm mt-1">{user.full_name}</p>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-dashed p-6 text-center text-muted-foreground">
          Placeholder Dashboard — Company creation and document upload coming in next prompt.
        </div>
      </div>
    </div>
  );
}
