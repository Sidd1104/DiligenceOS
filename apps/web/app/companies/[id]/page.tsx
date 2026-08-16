"use client";

import React, { useEffect, useState, useRef, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  UploadCloud,
  FileText,
  CheckCircle2,
  Clock,
  Loader2,
  AlertCircle,
  ShieldCheck,
  FileType,
  HardDrive,
  RefreshCw,
  Brain,
} from "lucide-react";

import { useAuth } from "@/lib/auth-context";
import { Company, fetchCompany } from "@/lib/companies";
import {
  DocumentItem,
  DocumentStatus,
  fetchCompanyDocuments,
  uploadDocument,
} from "@/lib/documents";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface CompanyPageProps {
  params: Promise<{ id: string }>;
}

const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB

export default function CompanyOverviewPage({ params }: CompanyPageProps) {
  const { id: companyId } = use(params);
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [company, setCompany] = useState<Company | null>(null);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loadingCompany, setLoadingCompany] = useState<boolean>(true);
  const [loadingDocs, setLoadingDocs] = useState<boolean>(true);

  // Upload & Error States
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Redirect if unauthenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  // Load company metadata
  useEffect(() => {
    async function loadComp() {
      try {
        setLoadingCompany(true);
        const data = await fetchCompany(companyId);
        setCompany(data);
      } catch (err: any) {
        // Company fetch error handled in UI
      } finally {
        setLoadingCompany(false);
      }
    }
    if (user && companyId) {
      loadComp();
    }
  }, [user, companyId]);

  // Load documents
  const loadDocuments = async (showLoadingSkeleton = false) => {
    try {
      if (showLoadingSkeleton) setLoadingDocs(true);
      const docs = await fetchCompanyDocuments(companyId);
      setDocuments(docs);
    } catch (err: any) {
      console.error("Failed to load documents:", err);
    } finally {
      if (showLoadingSkeleton) setLoadingDocs(false);
    }
  };

  useEffect(() => {
    if (user && companyId) {
      loadDocuments(true);
    }
  }, [user, companyId]);

  // Polling: Check if any document is QUEUED or PROCESSING
  const hasPendingDocs = documents.some(
    (doc) => doc.status === "QUEUED" || doc.status === "PROCESSING"
  );

  useEffect(() => {
    if (!hasPendingDocs || !user || !companyId) return;

    const intervalId = setInterval(() => {
      loadDocuments(false);
    }, 2000);

    return () => clearInterval(intervalId);
  }, [hasPendingDocs, user, companyId]);

  // File Upload Handler
  const handleFile = async (file: File) => {
    setUploadError(null);

    // Client-side validations
    if (!file.name.toLowerCase().endsWith(".pdf") && file.type !== "application/pdf") {
      setUploadError("Only PDF files are allowed.");
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setUploadError(
        `File size (${(file.size / (1024 * 1024)).toFixed(1)}MB) exceeds maximum limit of 50MB.`
      );
      return;
    }

    try {
      setUploading(true);
      await uploadDocument(companyId, file);
      await loadDocuments(false);
    } catch (err: any) {
      setUploadError(err.message || "Failed to upload document");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  // Helper formats
  const formatFileSize = (bytes?: number | null) => {
    if (!bytes) return "Unknown size";
    if (bytes >= 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }
    return `${(bytes / 1024).toFixed(0)} KB`;
  };

  const formatDocType = (type?: string | null) => {
    if (!type) return "Document";
    switch (type) {
      case "annual_report":
        return "Annual Report";
      case "pitch_deck":
        return "Pitch Deck";
      case "financial_statement":
        return "Financial Statement";
      default:
        return "Document";
    }
  };

  const renderStatusBadge = (doc: DocumentItem) => {
    switch (doc.status) {
      case "QUEUED":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-600 dark:text-amber-400">
            <Clock className="h-3 w-3 animate-pulse" />
            Queued
          </span>
        );
      case "PROCESSING":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/10 px-2.5 py-0.5 text-xs font-medium text-blue-600 dark:text-blue-400">
            <Loader2 className="h-3 w-3 animate-spin" />
            Processing
          </span>
        );
      case "COMPLETED":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-3 w-3" />
            Completed
          </span>
        );
      case "FAILED":
        return (
          <div className="flex flex-col sm:items-end">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-destructive/10 px-2.5 py-0.5 text-xs font-medium text-destructive">
              <AlertCircle className="h-3 w-3" />
              Failed
            </span>
            {doc.error_message && (
              <span className="text-[11px] text-destructive/80 mt-1 max-w-[220px] sm:text-right text-left" title={doc.error_message}>
                {doc.error_message}
              </span>
            )}
          </div>
        );
    }
  };

  if (authLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Skeleton className="h-8 w-48" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0f19] text-[#f8fafc]">
      {/* Top Header */}
      <header className="border-b border-white/10 bg-[#0b0f19]/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-xs text-[#94a3b8] hover:text-[#f8fafc] transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-[#2563eb]" />
            <span className="text-sm font-semibold tracking-tight font-heading">DiligenceOS</span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Company Header */}
        {loadingCompany ? (
          <div className="space-y-3">
            <Skeleton className="h-9 w-64 bg-white/5" />
            <Skeleton className="h-4 w-48 bg-white/5" />
          </div>
        ) : !company ? (
          <div className="rounded-2xl border border-[#ef4444]/30 bg-[#ef4444]/10 p-8 text-center space-y-4 max-w-md mx-auto my-12 backdrop-blur-md">
            <AlertCircle className="h-8 w-8 text-[#ef4444] mx-auto" />
            <h3 className="text-lg font-semibold font-heading">Company Not Found</h3>
            <p className="text-xs text-[#94a3b8]">
              The requested company does not exist or you do not have permission to access it.
            </p>
            <Link href="/dashboard">
              <Button variant="outline" className="border-white/10 bg-[#131b2e] text-[#f8fafc]">Return to Dashboard</Button>
            </Link>
          </div>
        ) : (
          <>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-3xl font-semibold tracking-tight font-heading text-[#f8fafc]">{company.name}</h1>
                  {company.industry ? (
                    <span className="rounded-full bg-[#2563eb]/10 px-3 py-1 text-xs font-mono text-[#2563eb] border border-[#2563eb]/20">
                      {company.industry}
                    </span>
                  ) : (
                    <span className="rounded-full bg-white/5 px-3 py-1 text-xs font-mono text-[#94a3b8] border border-white/10">
                      Unspecified Industry
                    </span>
                  )}
                </div>
                <p className="text-xs sm:text-sm text-[#94a3b8] mt-1.5 leading-relaxed">
                  {company.description || "Institutional due-diligence & evidence retrieval workspace"}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <Link href={`/companies/${company.id}/research`}>
                  <Button className="gap-2 bg-[#2563eb] hover:bg-[#1d4ed8] text-white shadow-sm font-medium">
                    <Brain className="h-4 w-4" />
                    AI Research Assistant
                  </Button>
                </Link>
                {hasPendingDocs && (
                  <div className="flex items-center gap-2 text-xs text-[#2563eb] bg-[#2563eb]/10 border border-[#2563eb]/20 px-3 py-1.5 rounded-full w-fit">
                    <RefreshCw className="h-3.5 w-3.5 animate-spin text-[#2563eb]" />
                    <span className="font-mono">Processing pipeline active...</span>
                  </div>
                )}
              </div>
            </div>

            {/* Document Management Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left Column: Upload Dropzone Card */}
              <div className="lg:col-span-1 space-y-4">
                <Card className="border border-white/10 bg-[#131b2e]">
                  <CardHeader>
                    <CardTitle className="text-base font-heading flex items-center gap-2 text-[#f8fafc]">
                      <UploadCloud className="h-5 w-5 text-[#2563eb]" />
                      Upload Target Document
                    </CardTitle>
                    <CardDescription className="text-xs text-[#94a3b8]">
                      PDF format only (annual reports, pitch decks, financials). Max size: 50MB.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Error Banner */}
                    {uploadError && (
                      <div className="rounded-xl bg-[#ef4444]/10 p-3.5 text-xs text-[#ef4444] border border-[#ef4444]/20 flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                        <span>{uploadError}</span>
                      </div>
                    )}

                    {/* Drag and Drop Zone */}
                    <div
                      onDragEnter={handleDrag}
                      onDragLeave={handleDrag}
                      onDragOver={handleDrag}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className={`relative flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-xl cursor-pointer transition-all ${
                        dragActive
                          ? "border-[#2563eb] bg-[#2563eb]/10 scale-[0.99]"
                          : "border-white/10 bg-[#080b14]/60 hover:border-[#2563eb]/50 hover:bg-[#080b14]"
                      } ${uploading ? "pointer-events-none opacity-60" : ""}`}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,application/pdf"
                        onChange={handleFileSelect}
                        className="hidden"
                      />

                      {uploading ? (
                        <div className="flex flex-col items-center gap-2 py-4">
                          <Loader2 className="h-8 w-8 animate-spin text-[#2563eb]" />
                          <p className="text-xs font-medium text-[#94a3b8]">
                            Uploading & Initializing PDF...
                          </p>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-2 text-center py-2">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#2563eb]/10 text-[#2563eb] border border-[#2563eb]/20">
                            <UploadCloud className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="text-xs font-medium text-[#f8fafc]">
                              Click to browse <span className="font-normal text-[#94a3b8]">or drag PDF here</span>
                            </p>
                            <p className="text-[11px] text-[#94a3b8] mt-0.5">
                              Supports standard PDF files up to 50MB
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Right Column: Documents List */}
              <div className="lg:col-span-2 space-y-4">
                <Card className="h-full flex flex-col justify-between border border-white/10 bg-[#131b2e]">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b border-white/10">
                    <div>
                      <CardTitle className="text-base font-heading flex items-center gap-2 text-[#f8fafc]">
                        <FileText className="h-5 w-5 text-[#2563eb]" />
                        Company Documents ({documents.length})
                      </CardTitle>
                      <CardDescription className="mt-1 text-xs text-[#94a3b8]">
                        Uploaded company documents and extraction status
                      </CardDescription>
                    </div>
                  </CardHeader>

                  <CardContent className="flex-1 pt-6">
                    {loadingDocs ? (
                      <div className="space-y-3 py-2">
                        <Skeleton className="h-12 w-full rounded-lg bg-white/5" />
                        <Skeleton className="h-12 w-full rounded-lg bg-white/5" />
                      </div>
                    ) : documents.length === 0 ? (
                      /* Empty State */
                      <div className="rounded-xl border border-dashed border-white/10 bg-[#080b14]/50 p-8 text-center flex flex-col items-center justify-center space-y-3 my-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5 text-[#94a3b8] border border-white/10">
                          <FileType className="h-6 w-6" />
                        </div>
                        <div className="space-y-1">
                          <h4 className="text-sm font-semibold font-heading text-[#f8fafc]">No documents uploaded yet</h4>
                          <p className="text-xs text-[#94a3b8] max-w-xs mx-auto">
                            Upload annual reports, pitch decks, or financial statements to start processing.
                          </p>
                        </div>
                      </div>
                    ) : (
                      /* Document Items List */
                      <div className="divide-y divide-white/10 rounded-xl border border-white/10 bg-[#080b14]/40 overflow-hidden">
                        {documents.map((doc) => (
                          <div
                            key={doc.id}
                            className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-3 hover:bg-white/5 transition-colors"
                          >
                            <div className="flex items-start gap-3 min-w-0">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#2563eb]/10 text-[#2563eb] border border-[#2563eb]/20 mt-0.5">
                                <FileText className="h-5 w-5" />
                              </div>
                              <div className="min-w-0">
                                {doc.status === "COMPLETED" ? (
                                  <Link
                                    href={`/companies/${companyId}/documents/${doc.id}`}
                                    className="text-sm font-medium leading-none truncate text-[#f8fafc] hover:text-[#2563eb] hover:underline block"
                                    title={doc.filename}
                                  >
                                    {doc.filename}
                                  </Link>
                                ) : (
                                  <p className="text-sm font-medium leading-none truncate text-[#f8fafc]" title={doc.filename}>
                                    {doc.filename}
                                  </p>
                                )}
                                <div className="flex flex-wrap items-center gap-2 text-xs text-[#94a3b8] mt-1.5">
                                  <span>{formatDocType(doc.document_type)}</span>
                                  <span>•</span>
                                  <span className="font-mono text-[11px]">{formatFileSize(doc.file_size_bytes)}</span>
                                  <span>•</span>
                                  <span className="font-mono text-[11px]">{new Date(doc.created_at).toLocaleDateString()}</span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-3 sm:self-center self-end">
                              {renderStatusBadge(doc)}
                              {doc.status === "COMPLETED" && (
                                <Link href={`/companies/${companyId}/documents/${doc.id}`}>
                                  <Button variant="outline" size="sm" className="h-7 text-xs gap-1 border-white/10 bg-[#131b2e] text-[#f8fafc] hover:bg-[#1c273e]">
                                    View
                                  </Button>
                                </Link>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

