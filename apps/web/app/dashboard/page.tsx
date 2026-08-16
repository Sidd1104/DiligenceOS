"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Building2, ArrowRight, LogOut, ShieldCheck, Sparkles, AlertCircle } from "lucide-react";

import { useAuth } from "@/lib/auth-context";
import { Company, fetchCompanies, createCompany } from "@/lib/companies";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

export default function DashboardPage() {
  const { user, loading: authLoading, logout } = useAuth();
  const router = useRouter();

  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Dialog state
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);
  const [name, setName] = useState<string>("");
  const [industry, setIndustry] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  // Load companies
  const loadCompanies = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchCompanies();
      setCompanies(data);
    } catch (err: any) {
      setError(err.message || "Failed to load companies");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadCompanies();
    }
  }, [user]);

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  const handleOpenDialog = () => {
    setName("");
    setIndustry("");
    setDescription("");
    setFormError(null);
    setIsDialogOpen(true);
  };

  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError("Company name is required");
      return;
    }

    try {
      setIsSubmitting(true);
      setFormError(null);
      await createCompany({
        name: name.trim(),
        industry: industry.trim() || undefined,
        description: description.trim() || undefined,
      });

      setIsDialogOpen(false);
      await loadCompanies();
    } catch (err: any) {
      setFormError(err.message || "Failed to create company");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0f19] text-[#f8fafc]">
      {/* Top Header / Navigation Bar */}
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#0b0f19]/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#2563eb]/10 text-[#2563eb] border border-[#2563eb]/20 shadow-xs">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-base font-semibold tracking-tight font-heading">DiligenceOS</h1>
              <p className="text-xs text-[#94a3b8] hidden sm:block">
                Institutional Analyst Workspace
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 rounded-full border border-white/10 bg-[#131b2e] px-3 py-1 text-xs">
              <span className="h-2 w-2 rounded-full bg-[#10b981] animate-pulse" />
              <span className="font-mono text-[#94a3b8]">{user.email}</span>
            </div>

            <Button variant="ghost" size="sm" onClick={handleLogout} className="gap-1.5 text-[#94a3b8] hover:text-[#f8fafc]">
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </div>
      </header>


      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Telemetry Hero Section (Signature 3D Parallax Moment) */}
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#131b2e] via-[#0f1525] to-[#0b0f19] p-6 sm:p-8 shadow-xl">
          <div className="absolute -right-12 -top-12 h-64 w-64 rounded-full bg-[#2563eb]/10 blur-3xl pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-xl">
              <div className="inline-flex items-center gap-2 rounded-full bg-[#2563eb]/10 px-3 py-1 text-xs font-mono text-[#2563eb] border border-[#2563eb]/20">
                <Sparkles className="h-3.5 w-3.5" />
                <span>INSTITUTIONAL TELEMETRY</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight font-heading text-[#f8fafc]">
                Portfolio Due-Diligence Workspace
              </h2>
              <p className="text-xs sm:text-sm text-[#94a3b8] leading-relaxed">
                Evidence-backed financial analysis, page-accurate document extraction, and grounded AI research for investment professionals.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="rounded-xl border border-white/10 bg-[#080b14]/60 p-3.5 text-center backdrop-blur-xs">
                <p className="text-[11px] font-medium text-[#94a3b8] uppercase tracking-wider">Entities</p>
                <p className="text-2xl font-bold text-[#f8fafc] font-mono mt-0.5">{companies.length}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-[#080b14]/60 p-3.5 text-center backdrop-blur-xs">
                <p className="text-[11px] font-medium text-[#94a3b8] uppercase tracking-wider">Pipeline</p>
                <p className="text-2xl font-bold text-[#10b981] font-mono mt-0.5">Active</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-[#080b14]/60 p-3.5 text-center backdrop-blur-xs col-span-2 sm:col-span-1">
                <p className="text-[11px] font-medium text-[#94a3b8] uppercase tracking-wider">Embeddings</p>
                <p className="text-2xl font-bold text-[#2563eb] font-mono mt-0.5">1024-d</p>
              </div>
            </div>
          </div>
        </div>

        {/* Dashboard Title & Actions Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/10 pb-6">
          <div>
            <h3 className="text-xl font-semibold tracking-tight font-heading text-[#f8fafc]">Target Companies</h3>
            <p className="text-xs text-[#94a3b8] mt-1">
              Select or create a company workspace to manage documents and run AI research.
            </p>
          </div>

          <Button onClick={handleOpenDialog} className="gap-2 bg-[#2563eb] hover:bg-[#1d4ed8] text-white shadow-xs sm:self-auto self-start">
            <Plus className="h-4 w-4" />
            New Company
          </Button>
        </div>

        {/* Error Alert if initial loading failed */}
        {error && (
          <div className="rounded-xl border border-[#ef4444]/30 bg-[#ef4444]/10 p-4 text-[#ef4444] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <p className="text-sm font-medium">{error}</p>
            </div>
            <Button variant="outline" size="sm" onClick={loadCompanies}>
              Retry
            </Button>
          </div>
        )}

        {/* Content Area: Skeleton Loading vs Empty State vs Company List */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="overflow-hidden">
                <CardHeader className="space-y-2">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <CardContent className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                </CardContent>
                <CardFooter>
                  <Skeleton className="h-3 w-1/3" />
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : companies.length === 0 ? (
          /* Designed Empty State */
          <div className="rounded-2xl border border-dashed p-12 text-center bg-card/50 flex flex-col items-center justify-center space-y-4 max-w-lg mx-auto my-8">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/60 text-muted-foreground">
              <Building2 className="h-7 w-7" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-semibold tracking-tight">No companies yet</h3>
              <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                Get started by adding your first target company to analyze financials and documents.
              </p>
            </div>
            <Button onClick={handleOpenDialog} className="gap-2 mt-2">
              <Plus className="h-4 w-4" />
              Create your first company
            </Button>
          </div>
        ) : (
          /* Company Cards Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {companies.map((company) => (
              <Link key={company.id} href={`/companies/${company.id}`} className="group block focus:outline-none">
                <Card className="h-full flex flex-col justify-between transition-all duration-200 group-hover:border-ring group-hover:shadow-md">
                  <CardHeader className="space-y-2 pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="group-hover:text-primary transition-colors line-clamp-1">
                        {company.name}
                      </CardTitle>
                      <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all shrink-0" />
                    </div>
                    {company.industry ? (
                      <span className="inline-flex items-center rounded-md bg-secondary/80 px-2.5 py-0.5 text-xs font-medium text-secondary-foreground w-fit">
                        {company.industry}
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground w-fit">
                        Unspecified Industry
                      </span>
                    )}
                  </CardHeader>

                  <CardContent className="pb-4">
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {company.description || "No description provided."}
                    </p>
                  </CardContent>

                  <CardFooter className="border-t pt-3 text-xs text-muted-foreground flex justify-between items-center">
                    <span>Added {new Date(company.created_at).toLocaleDateString()}</span>
                    <span className="font-mono text-[10px] text-muted-foreground/70">
                      ID: {company.id.slice(0, 8)}...
                    </span>
                  </CardFooter>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>

      {/* New Company Dialog Modal */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <form onSubmit={handleCreateCompany}>
            <DialogHeader>
              <DialogTitle>New Company</DialogTitle>
              <DialogDescription>
                Add a target company to your workspace. You can upload documents once created.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              {formError && (
                <div className="rounded-lg bg-destructive/10 p-3 text-xs text-destructive flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid gap-1.5">
                <label htmlFor="name" className="text-xs font-medium">
                  Company Name <span className="text-destructive">*</span>
                </label>
                <Input
                  id="name"
                  placeholder="e.g. Acme Corporation"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoFocus
                  required
                />
              </div>

              <div className="grid gap-1.5">
                <label htmlFor="industry" className="text-xs font-medium">
                  Industry / Sector
                </label>
                <Input
                  id="industry"
                  placeholder="e.g. Enterprise Software, Healthcare"
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                />
              </div>

              <div className="grid gap-1.5">
                <label htmlFor="description" className="text-xs font-medium">
                  Description
                </label>
                <Textarea
                  id="description"
                  placeholder="Brief summary or context about this company..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Creating..." : "Create Company"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
