"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Building2, Calendar, FileText, FolderGit2, ShieldCheck, AlertCircle } from "lucide-react";

import { useAuth } from "@/lib/auth-context";
import { Company, fetchCompany } from "@/lib/companies";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface CompanyPageProps {
  params: Promise<{ id: string }>;
}

export default function CompanyPlaceholderPage({ params }: CompanyPageProps) {
  const { id } = use(params);
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchCompany(id);
        setCompany(data);
      } catch (err: any) {
        setError(err.message || "Failed to load company details");
      } finally {
        setLoading(false);
      }
    }
    if (user && id) {
      load();
    }
  }, [user, id]);

  if (authLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Skeleton className="h-8 w-48" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navigation Header */}
      <header className="border-b bg-background/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/dashboard" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <span className="text-sm font-semibold">DiligenceOS</span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {loading ? (
          <div className="space-y-6">
            <Skeleton className="h-10 w-2/3" />
            <Skeleton className="h-32 w-full rounded-xl" />
          </div>
        ) : error || !company ? (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-8 text-center space-y-4 max-w-md mx-auto my-12">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/20 text-destructive mx-auto">
              <AlertCircle className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-semibold">Company Not Found</h3>
              <p className="text-sm text-muted-foreground">
                {error || "The requested company does not exist or you do not have permission to view it."}
              </p>
            </div>
            <Link href="/dashboard">
              <Button variant="outline" className="mt-2">
                Return to Dashboard
              </Button>
            </Link>
          </div>
        ) : (
          <>
            {/* Company Overview Header */}
            <div className="border-b pb-6 space-y-2">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-3xl font-bold tracking-tight">
                  Company: {company.name}
                </h1>
                {company.industry && (
                  <span className="rounded-md bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
                    {company.industry}
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                Company overview & diligence workspace
              </p>
            </div>

            {/* Company Details Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  Company Details
                </CardTitle>
                <CardDescription>Basic metadata for this company</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Description
                  </h4>
                  <p className="text-sm mt-1 text-foreground">
                    {company.description || "No description provided."}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t text-sm">
                  <div>
                    <span className="text-muted-foreground text-xs block">Company ID</span>
                    <span className="font-mono text-xs mt-0.5 block">{company.id}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-xs block">Workspace ID</span>
                    <span className="font-mono text-xs mt-0.5 block">{company.workspace_id}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-xs block">Created Date</span>
                    <span className="text-xs mt-0.5 block">
                      {new Date(company.created_at).toLocaleString()}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Placeholder Banner for Future Upload / RAG Scope */}
            <div className="rounded-xl border border-dashed p-8 text-center bg-muted/20 space-y-3">
              <FileText className="h-8 w-8 text-muted-foreground mx-auto" />
              <div>
                <h3 className="text-sm font-semibold">Document Upload & AI Diligence</h3>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
                  Document upload, background processing, and evidence-backed RAG research for {company.name} will be added in the next prompt.
                </p>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
