"use client";

import React, { useEffect, useState, useRef, useCallback, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  UploadCloud,
  FileText,
  CheckCircle2,
  Clock,
  Loader2,
  AlertCircle,
  ShieldCheck,
  FileType,
  RefreshCw,
  Brain,
  TrendingUp,
  Presentation,
  ClipboardList,
  Plus,
  Trash2,
} from "lucide-react";

import { useAuth } from "@/lib/auth-context";
import { Company, fetchCompany } from "@/lib/companies";
import {
  DocumentItem,
  fetchCompanyDocuments,
  retryDocument,
  uploadDocument,
  deleteDocument,
} from "@/lib/documents";
import { Button } from "@/components/ui/button";
import { DiligenceLogo } from "@/components/ui/logo";
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

  // Upload & Retry & Error States
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [retryingIds, setRetryingIds] = useState<Record<string, boolean>>({});
  const [deletingIds, setDeletingIds] = useState<Record<string, boolean>>({});

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleRetry = async (documentId: string) => {
    try {
      setRetryingIds((prev) => ({ ...prev, [documentId]: true }));
      await retryDocument(documentId);
      await loadDocuments(false);
    } catch (err: unknown) {
      console.error("Failed to retry document processing:", err);
    } finally {
      setRetryingIds((prev) => ({ ...prev, [documentId]: false }));
    }
  };

  const handleDelete = async (documentId: string) => {
    if (!window.confirm("Remove this document? This will permanently delete the file and all associated data.")) {
      return;
    }
    try {
      setDeletingIds((prev) => ({ ...prev, [documentId]: true }));
      await deleteDocument(documentId);
      await loadDocuments(false);
    } catch (err: unknown) {
      console.error("Failed to delete document:", err);
      const message = err instanceof Error ? err.message : "Failed to delete document";
      setUploadError(message);
    } finally {
      setDeletingIds((prev) => ({ ...prev, [documentId]: false }));
    }
  };

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
      } catch {
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
  const loadDocuments = useCallback(async (showLoadingSkeleton = false) => {
    try {
      if (showLoadingSkeleton) setLoadingDocs(true);
      const docs = await fetchCompanyDocuments(companyId);
      setDocuments(docs);
    } catch (err: unknown) {
      console.error("Failed to load documents:", err);
    } finally {
      if (showLoadingSkeleton) setLoadingDocs(false);
    }
  }, [companyId]);

  useEffect(() => {
    if (user && companyId) {
      loadDocuments(true);
    }
  }, [user, companyId, loadDocuments]);

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
  }, [hasPendingDocs, user, companyId, loadDocuments]);

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
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to upload document";
      setUploadError(message);
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
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#f59e0b]/10 px-2.5 py-0.5 text-xs font-medium text-[#f59e0b]">
            <Clock className="h-3 w-3 animate-pulse" />
            Queued
          </span>
        );
      case "PROCESSING":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#d4af6a]/10 px-2.5 py-0.5 text-xs font-medium text-[#d4af6a]">
            <Loader2 className="h-3 w-3 animate-spin" />
            Processing
          </span>
        );
      case "COMPLETED":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#10b981]/10 px-2.5 py-0.5 text-xs font-medium text-[#10b981]">
            <CheckCircle2 className="h-3 w-3" />
            Completed
          </span>
        );
      case "FAILED":
        return (
          <div className="flex flex-col sm:items-end">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#ef4444]/10 px-2.5 py-0.5 text-xs font-medium text-[#ef4444]">
              <AlertCircle className="h-3 w-3" />
              Failed
            </span>
            {doc.error_message && (
              <span className="text-[11px] text-[#ef4444]/80 mt-1 max-w-[220px] sm:text-right text-left" title={doc.error_message}>
                {doc.error_message}
              </span>
            )}
          </div>
        );
    }
  };

  if (authLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-transparent">
        <Skeleton className="h-8 w-48" />
      </div>
    );
  }

  return (
    <div className="relative z-2 min-h-screen text-[#f5f3ef]">
      {/* Top Header */}
      <header className="fixed top-0 left-0 right-0 z-50 h-16 border-b border-[rgba(245,243,239,0.08)] bg-[#0a0a0d]/95 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-xs text-[#9a968c] hover:text-[#f5f3ef] transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
          <Link href="/dashboard">
            <DiligenceLogo className="w-7 h-7" textSize="text-sm" />
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-12 space-y-8">
        {/* Company Header */}
        {loadingCompany ? (
          <div className="space-y-3">
            <Skeleton className="h-9 w-64" />
            <Skeleton className="h-4 w-48" />
          </div>
        ) : !company ? (
          <div className="rounded-2xl border border-[#ef4444]/30 bg-[#ef4444]/10 p-8 text-center space-y-4 max-w-md mx-auto my-12 backdrop-blur-md">
            <AlertCircle className="h-8 w-8 text-[#ef4444] mx-auto" />
            <h3 className="text-lg font-semibold font-heading">Company Not Found</h3>
            <p className="text-xs text-[#9a968c]">
              The requested company does not exist or you do not have permission to access it.
            </p>
            <Link href="/dashboard">
              <Button variant="outline">Return to Dashboard</Button>
            </Link>
          </div>
        ) : (
          <>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[rgba(245,243,239,0.08)] pb-6">
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-3xl font-semibold tracking-tight font-heading text-[#f5f3ef]">{company.name}</h1>
                  {company.industry ? (
                    <span className="rounded-full bg-[rgba(212,175,106,0.14)] px-3 py-1 text-xs font-mono text-[#d4af6a] border border-[rgba(212,175,106,0.28)]">
                      {company.industry}
                    </span>
                  ) : (
                    <span className="rounded-full bg-white/5 px-3 py-1 text-xs font-mono text-[#9a968c] border border-[rgba(245,243,239,0.08)]">
                      Unspecified Industry
                    </span>
                  )}
                </div>
                <p className="text-xs sm:text-sm text-[#9a968c] mt-1.5 leading-relaxed">
                  {company.description || "Institutional due-diligence & evidence retrieval workspace"}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <Link href={`/companies/${company.id}/research`}>
                  <Button className="gap-2 shadow-sm font-medium">
                    <Brain className="h-4 w-4" />
                    AI Research Assistant
                  </Button>
                </Link>
                {hasPendingDocs && (
                  <div className="flex items-center gap-2 text-xs text-[#d4af6a] bg-[rgba(212,175,106,0.14)] border border-[rgba(212,175,106,0.28)] px-3 py-1.5 rounded-full w-fit">
                    <RefreshCw className="h-3.5 w-3.5 animate-spin text-[#d4af6a]" />
                    <span className="font-mono">Processing pipeline active...</span>
                  </div>
                )}
              </div>
            </div>

            {/* Document Management Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left Column: Upload Dropzone Card */}
              <div className="lg:col-span-1 space-y-4">
                <Card className="border border-[rgba(245,243,239,0.08)] bg-[#15151c] hover:border-[rgba(212,175,106,0.28)] hover:-translate-y-0.5">
                  <CardHeader>
                    <CardTitle className="text-base font-heading flex items-center gap-2 text-[#f5f3ef]">
                      <UploadCloud className="h-5 w-5 text-[#d4af6a]" />
                      Upload Target Document
                    </CardTitle>
                    <CardDescription className="text-xs text-[#9a968c]">
                      PDF format only (annual reports, pitch decks, financials). Max size: 50MB.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Document Type Helper Chips */}
                    <div className="grid grid-cols-2 gap-2">
                      <span className="flex items-center gap-1.5 rounded-lg border border-[rgba(245,243,239,0.08)] bg-[#0d0d11] px-2.5 py-1.5 text-xs text-[#9a968c]">
                        <TrendingUp className="h-3.5 w-3.5 text-[#d4af6a] shrink-0" />
                        <span>Annual reports / 10-K</span>
                      </span>
                      <span className="flex items-center gap-1.5 rounded-lg border border-[rgba(245,243,239,0.08)] bg-[#0d0d11] px-2.5 py-1.5 text-xs text-[#9a968c]">
                        <Presentation className="h-3.5 w-3.5 text-[#d4af6a] shrink-0" />
                        <span>Pitch decks</span>
                      </span>
                      <span className="flex items-center gap-1.5 rounded-lg border border-[rgba(245,243,239,0.08)] bg-[#0d0d11] px-2.5 py-1.5 text-xs text-[#9a968c]">
                        <Plus className="h-3.5 w-3.5 text-[#d4af6a] shrink-0" />
                        <span>Financial statements</span>
                      </span>
                      <span className="flex items-center gap-1.5 rounded-lg border border-[rgba(245,243,239,0.08)] bg-[#0d0d11] px-2.5 py-1.5 text-xs text-[#9a968c]">
                        <ClipboardList className="h-3.5 w-3.5 text-[#d4af6a] shrink-0" />
                        <span>Board decks / memos</span>
                      </span>
                    </div>

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
                          ? "border-[#d4af6a] bg-[rgba(212,175,106,0.1)] scale-[0.99]"
                          : "border-[rgba(245,243,239,0.08)] bg-[#0d0d11]/60 hover:border-[rgba(212,175,106,0.28)] hover:bg-[#0d0d11]"
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
                          <Loader2 className="h-8 w-8 animate-spin text-[#d4af6a]" />
                          <p className="text-xs font-medium text-[#9a968c]">
                            Uploading & Initializing PDF...
                          </p>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-2 text-center py-2">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[rgba(212,175,106,0.14)] text-[#d4af6a] border border-[rgba(212,175,106,0.28)]">
                            <UploadCloud className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="text-xs font-medium text-[#f5f3ef]">
                              Click to browse <span className="font-normal text-[#9a968c]">or drag PDF here</span>
                            </p>
                            <p className="text-[11px] text-[#9a968c] mt-0.5">
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
                <Card className="h-full flex flex-col justify-between border border-[rgba(245,243,239,0.08)] bg-[#15151c] hover:border-transparent hover:translate-y-0">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b border-[rgba(245,243,239,0.08)]">
                    <div>
                      <CardTitle className="text-base font-heading flex items-center gap-2 text-[#f5f3ef]">
                        <FileText className="h-5 w-5 text-[#d4af6a]" />
                        Company Documents ({documents.length})
                      </CardTitle>
                      <CardDescription className="mt-1 text-xs text-[#9a968c]">
                        Uploaded company documents and extraction status
                      </CardDescription>
                    </div>
                  </CardHeader>

                  <CardContent className="flex-1 pt-6">
                    {loadingDocs ? (
                      <div className="space-y-3 py-2">
                        <Skeleton className="h-12 w-full rounded-lg" />
                        <Skeleton className="h-12 w-full rounded-lg" />
                      </div>
                    ) : documents.length === 0 ? (
                      /* Empty State */
                      <div className="rounded-xl border border-dashed border-[rgba(245,243,239,0.08)] bg-[#0d0d11]/50 p-8 text-center flex flex-col items-center justify-center space-y-3 my-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[rgba(212,175,106,0.14)] text-[#d4af6a] border border-[rgba(212,175,106,0.28)]">
                          <FileType className="h-6 w-6" />
                        </div>
                        <div className="space-y-1">
                          <h4 className="text-sm font-semibold font-heading text-[#f5f3ef]">No documents uploaded yet</h4>
                          <p className="text-xs text-[#9a968c] max-w-xs mx-auto">
                            Upload annual reports, pitch decks, or financial statements to start processing.
                          </p>
                        </div>
                      </div>
                    ) : (
                      /* Document Items List */
                      <div className="divide-y divide-[rgba(245,243,239,0.08)] rounded-xl border border-[rgba(245,243,239,0.08)] bg-[#0d0d11]/40 overflow-hidden">
                        {documents.map((doc) => (
                          <div
                            key={doc.id}
                            className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-3 transition-colors"
                          >
                            <div className="flex items-start gap-3 min-w-0">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[rgba(212,175,106,0.14)] text-[#d4af6a] border border-[rgba(212,175,106,0.28)] mt-0.5">
                                <FileText className="h-5 w-5" />
                              </div>
                              <div className="min-w-0">
                                {doc.status === "COMPLETED" ? (
                                  <Link
                                    href={`/companies/${companyId}/documents/${doc.id}`}
                                    className="text-sm font-medium leading-none truncate text-[#f5f3ef] hover:text-[#d4af6a] hover:underline block"
                                    title={doc.filename}
                                  >
                                    {doc.filename}
                                  </Link>
                                ) : (
                                  <p className="text-sm font-medium leading-none truncate text-[#f5f3ef]" title={doc.filename}>
                                    {doc.filename}
                                  </p>
                                )}
                                <div className="flex flex-wrap items-center gap-2 text-xs text-[#9a968c] mt-1.5">
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
                              {doc.status === "FAILED" && (
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  disabled={retryingIds[doc.id]}
                                  onClick={() => handleRetry(doc.id)}
                                  className="h-7 text-xs gap-1.5"
                                >
                                  {retryingIds[doc.id] ? (
                                    <>
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                      Retrying...
                                    </>
                                  ) : (
                                    <>
                                      <RefreshCw className="h-3 w-3" />
                                      Retry
                                    </>
                                  )}
                                </Button>
                              )}
                              {doc.status === "COMPLETED" && (
                                <Link href={`/companies/${companyId}/documents/${doc.id}`}>
                                  <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
                                    View
                                  </Button>
                                </Link>
                              )}
                              {(doc.status === "COMPLETED" || doc.status === "FAILED") && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  disabled={deletingIds[doc.id]}
                                  onClick={() => handleDelete(doc.id)}
                                  className="h-7 w-7 p-0 text-[#9a968c] hover:text-[#ef4444] hover:bg-[#ef4444]/10"
                                  title="Remove document"
                                >
                                  {deletingIds[doc.id] ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <Trash2 className="h-3.5 w-3.5" />
                                  )}
                                </Button>
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
