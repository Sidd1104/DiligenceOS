"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Plus,
  Building2,
  ArrowRight,
  LogOut,
  ShieldCheck,
  Sparkles,
  AlertCircle,
  ChevronDown,
  HelpCircle,
  X,
} from "lucide-react";

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

  // Collapsible onboarding state for returning users
  const [showOnboarding, setShowOnboarding] = useState<boolean>(false);
  const [isBannerDismissed, setIsBannerDismissed] = useState<boolean>(false);

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
      <div className="flex min-h-screen items-center justify-center bg-transparent">
        <div className="flex flex-col items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
    );
  }

  const renderThreeSteps = () => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
      <div className="relative bg-[rgba(21,21,28,0.8)] backdrop-blur-md border border-[rgba(245,243,239,0.08)] rounded-xl p-5">
        <div className="font-mono text-[11px] text-[#d4af6a] mb-2">01</div>
        <h4 className="font-heading text-sm font-semibold text-[#f5f3ef] mb-1.5">Upload documents</h4>
        <p className="text-xs text-[#9a968c] leading-relaxed">
          Add a company&apos;s annual report, pitch deck, or financial statement as a PDF.
        </p>
        <span className="absolute right-[-11px] top-1/2 -translate-y-1/2 text-[#9a968c] z-10 hidden md:block">
          <ArrowRight className="h-4 w-4" />
        </span>
      </div>
      <div className="relative bg-[rgba(21,21,28,0.8)] backdrop-blur-md border border-[rgba(245,243,239,0.08)] rounded-xl p-5">
        <div className="font-mono text-[11px] text-[#d4af6a] mb-2">02</div>
        <h4 className="font-heading text-sm font-semibold text-[#f5f3ef] mb-1.5">Automatic processing</h4>
        <p className="text-xs text-[#9a968c] leading-relaxed">
          The system extracts text, preserves page numbers, and indexes the content for search.
        </p>
        <span className="absolute right-[-11px] top-1/2 -translate-y-1/2 text-[#9a968c] z-10 hidden md:block">
          <ArrowRight className="h-4 w-4" />
        </span>
      </div>
      <div className="bg-[rgba(21,21,28,0.8)] backdrop-blur-md border border-[rgba(245,243,239,0.08)] rounded-xl p-5">
        <div className="font-mono text-[11px] text-[#d4af6a] mb-2">03</div>
        <h4 className="font-heading text-sm font-semibold text-[#f5f3ef] mb-1.5">Ask & verify</h4>
        <p className="text-xs text-[#9a968c] leading-relaxed">
          Ask a question, get an answer grounded in the document — with a citation to the exact page.
        </p>
      </div>
    </div>
  );

  return (
    <div className="relative z-2 min-h-screen text-[#f5f3ef]">
      {/* Top Header / Navigation Bar */}
      <header className="sticky top-0 z-30 border-b border-[rgba(245,243,239,0.08)] bg-[rgba(10,10,13,0.88)] backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[rgba(212,175,106,0.14)] text-[#d4af6a] border border-[rgba(212,175,106,0.28)] shadow-xs">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-base font-semibold tracking-tight font-heading">DiligenceOS</h1>
              <p className="text-xs text-[#9a968c] hidden sm:block">
                Institutional Analyst Workspace
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 rounded-full border border-[rgba(245,243,239,0.08)] bg-[#15151c] px-3 py-1 text-xs">
              <span className="h-2 w-2 rounded-full bg-[#10b981] animate-pulse" />
              <span className="font-mono text-[#9a968c]">{user.email}</span>
            </div>

            <Button variant="ghost" size="sm" onClick={handleLogout} className="gap-1.5 text-[#9a968c] hover:text-[#f5f3ef]">
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Telemetry Hero Section */}
        <div className="relative overflow-hidden rounded-2xl border border-[rgba(245,243,239,0.08)] bg-gradient-to-br from-[rgba(21,21,28,0.92)] via-[rgba(16,16,21,0.95)] to-[rgba(10,10,13,0.98)] p-6 sm:p-8 shadow-xl backdrop-blur-md">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-xl">
              <div className="inline-flex items-center gap-2 rounded-full bg-[rgba(212,175,106,0.14)] px-3 py-1 text-[11px] font-mono text-[#d4af6a] border border-[rgba(212,175,106,0.28)] uppercase tracking-wider">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Institutional Telemetry</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight font-heading text-[#f5f3ef]">
                Portfolio Due-Diligence Workspace
              </h2>
              <p className="text-xs sm:text-sm text-[#9a968c] leading-relaxed">
                Evidence-backed financial analysis, page-accurate document extraction, and grounded AI research for investment professionals.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="rounded-xl border border-[rgba(245,243,239,0.08)] bg-[rgba(13,13,17,0.7)] p-4 text-center">
                <p className="text-[11px] font-medium text-[#9a968c] uppercase tracking-wider">Entities</p>
                <p className="text-2xl font-bold text-[#f5f3ef] font-mono mt-1">{companies.length}</p>
              </div>
              <div className="rounded-xl border border-[rgba(245,243,239,0.08)] bg-[rgba(13,13,17,0.7)] p-4 text-center">
                <p className="text-[11px] font-medium text-[#9a968c] uppercase tracking-wider">Pipeline</p>
                <p className="text-lg font-bold text-[#10b981] font-mono mt-1">Active</p>
              </div>
              <div className="rounded-xl border border-[rgba(245,243,239,0.08)] bg-[rgba(13,13,17,0.7)] p-4 text-center col-span-2 sm:col-span-1">
                <p className="text-[11px] font-medium text-[#9a968c] uppercase tracking-wider">Embeddings</p>
                <p className="text-2xl font-bold text-[#d4af6a] font-mono mt-1">1024-d</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Onboarding Section Logic ──────────────────────────────────── */}
        {/* Case A: Zero companies — render full 3-step onboarding strip */}
        {companies.length === 0 ? (
          renderThreeSteps()
        ) : (
          /* Case B: 1+ companies — render small, dismissible collapsed hint banner */
          !isBannerDismissed && (
            <div className="rounded-xl border border-[rgba(245,243,239,0.08)] bg-[rgba(21,21,28,0.75)] backdrop-blur-md overflow-hidden transition-all">
              <div className="flex items-center justify-between px-4 py-3 text-xs">
                <button
                  onClick={() => setShowOnboarding(!showOnboarding)}
                  className="flex items-center gap-2 text-[#9a968c] hover:text-[#f5f3ef] transition-colors text-left flex-1"
                >
                  <HelpCircle className="h-4 w-4 text-[#d4af6a] shrink-0" />
                  <span className="font-medium text-[#f5f3ef]">New here? See how DiligenceOS works</span>
                  <ChevronDown
                    className={`h-4 w-4 text-[#9a968c] transition-transform duration-200 ${
                      showOnboarding ? "rotate-180" : ""
                    }`}
                  />
                </button>
                <button
                  onClick={() => setIsBannerDismissed(true)}
                  className="text-[#9a968c] hover:text-[#f5f3ef] p-1 rounded-md transition-colors ml-2"
                  title="Dismiss guide"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              {showOnboarding && (
                <div className="p-4 pt-0 border-t border-[rgba(245,243,239,0.06)]">
                  <div className="pt-3">{renderThreeSteps()}</div>
                </div>
              )}
            </div>
          )
        )}

        {/* Dashboard Title & Actions Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[rgba(245,243,239,0.08)] pb-6">
          <div>
            <h3 className="text-xl font-semibold tracking-tight font-heading text-[#f5f3ef]">Target Companies</h3>
            <p className="text-xs text-[#9a968c] mt-1">
              Select or create a company workspace to manage documents and run AI research.
            </p>
          </div>

          <Button onClick={handleOpenDialog} className="gap-2 sm:self-auto self-start">
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
          <div className="rounded-2xl border border-[rgba(245,243,239,0.08)] p-14 text-center bg-[rgba(21,21,28,0.85)] backdrop-blur-md flex flex-col items-center justify-center space-y-5 max-w-lg mx-auto my-8">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[rgba(212,175,106,0.14)] text-[#d4af6a] border border-[rgba(212,175,106,0.28)]">
              <Building2 className="h-7 w-7" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold tracking-tight font-heading">No companies yet</h3>
              <p className="text-sm text-[#9a968c] max-w-xs mx-auto leading-relaxed">
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
                <Card className="h-full flex flex-col justify-between border border-[rgba(245,243,239,0.08)] bg-[#15151c] transition-all duration-150 hover:border-[rgba(212,175,106,0.28)] hover:bg-[#1c1c24]/70 hover:shadow-lg">
                  <CardHeader className="space-y-2 pb-3 border-b border-[rgba(245,243,239,0.04)]">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="font-heading text-base font-semibold text-[#f5f3ef] group-hover:text-[#d4af6a] transition-colors line-clamp-1">
                        {company.name}
                      </CardTitle>
                      <ArrowRight className="h-4 w-4 text-[#9a968c] opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all shrink-0" />
                    </div>
                    {company.industry ? (
                      <span className="inline-flex items-center rounded-full bg-[rgba(212,175,106,0.14)] px-2.5 py-0.5 text-xs font-mono text-[#d4af6a] border border-[rgba(212,175,106,0.28)] w-fit">
                        {company.industry}
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-white/5 px-2 py-0.5 text-xs font-mono text-[#9a968c] border border-[rgba(245,243,239,0.08)] w-fit">
                        Unspecified Industry
                      </span>
                    )}
                  </CardHeader>

                  <CardContent className="py-4">
                    <p className="text-xs text-[#9a968c] line-clamp-2 leading-relaxed">
                      {company.description || "Institutional due-diligence & evidence retrieval workspace."}
                    </p>
                  </CardContent>

                  <CardFooter className="border-t border-[rgba(245,243,239,0.04)] pt-3 text-[11px] text-[#9a968c] flex justify-between items-center font-mono">
                    <span>Added {new Date(company.created_at).toLocaleDateString()}</span>
                    <span className="text-[#9a968c]/70">
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
                <div className="rounded-lg bg-[#ef4444]/10 p-3 text-xs text-[#ef4444] flex items-center gap-2 border border-[#ef4444]/20">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid gap-1.5">
                <label htmlFor="name" className="text-xs font-medium text-[#9a968c]">
                  Company Name <span className="text-[#ef4444]">*</span>
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
                <label htmlFor="industry" className="text-xs font-medium text-[#9a968c]">
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
                <label htmlFor="description" className="text-xs font-medium text-[#9a968c]">
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
