"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  FileText,
  Loader2,
  AlertCircle,
  ZoomIn,
  ZoomOut,
  Maximize2,
  ExternalLink,
  ShieldCheck,
  Download,
  Building2,
  Sparkles,
} from "lucide-react";

import { useAuth } from "@/lib/auth-context";
import { Company, fetchCompany } from "@/lib/companies";
import {
  DocumentItem,
  fetchDocument,
  fetchDocumentSignedUrl,
} from "@/lib/documents";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

interface PageProps {
  params: Promise<{ id: string; documentId: string }>;
}

export default function DocumentViewerPage({ params }: PageProps) {
  const { id: companyId, documentId } = use(params);
  const searchParams = useSearchParams();
  const initialPage = parseInt(searchParams.get("page") || "1", 10);

  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [company, setCompany] = useState<Company | null>(null);
  const [docItem, setDocItem] = useState<DocumentItem | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  
  // Navigation & Zoom States
  const [currentPage, setCurrentPage] = useState<number>(initialPage > 0 ? initialPage : 1);
  const [pageInput, setPageInput] = useState<string>(String(initialPage > 0 ? initialPage : 1));
  const [scale, setScale] = useState<number>(1.0);
  const [useNativeViewer, setUseNativeViewer] = useState<boolean>(true);

  // Loading & Error States
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Sync initial page if URL search parameter changes
  useEffect(() => {
    const pageParam = parseInt(searchParams.get("page") || "1", 10);
    if (pageParam > 0) {
      setCurrentPage(pageParam);
      setPageInput(String(pageParam));
    }
  }, [searchParams]);

  // Auth Redirect Guard
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  // Load Document & Presigned URL
  useEffect(() => {
    if (!user || !companyId || !documentId) return;

    async function loadViewerData() {
      try {
        setLoading(true);
        setError(null);

        const [compData, docData, urlData] = await Promise.all([
          fetchCompany(companyId).catch(() => null),
          fetchDocument(documentId),
          fetchDocumentSignedUrl(documentId),
        ]);

        setCompany(compData);
        setDocItem(docData);

        // Format absolute URL if path is relative
        let resolvedUrl = urlData.url;
        if (resolvedUrl.startsWith("/")) {
          const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
          resolvedUrl = `${apiBase}${resolvedUrl}`;
        }
        setPdfUrl(resolvedUrl);
      } catch (err: any) {
        setError(err.message || "Failed to load document for viewing.");
      } finally {
        setLoading(false);
      }
    }

    loadViewerData();
  }, [user, companyId, documentId]);

  const totalPages = docItem?.page_count || 1;

  // Page Navigation Handlers
  const handlePageChange = (newPage: number) => {
    const validPage = Math.max(1, Math.min(newPage, totalPages || 9999));
    setCurrentPage(validPage);
    setPageInput(String(validPage));

    // Update URL parameter without full page reload
    const newSearchParams = new URLSearchParams(searchParams.toString());
    newSearchParams.set("page", String(validPage));
    router.replace(`/companies/${companyId}/documents/${documentId}?${newSearchParams.toString()}`);
  };

  const handlePageInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseInt(pageInput, 10);
    if (!isNaN(parsed)) {
      handlePageChange(parsed);
    } else {
      setPageInput(String(currentPage));
    }
  };

  // Zoom Handlers
  const handleZoomIn = () => setScale((prev) => Math.min(prev + 0.25, 2.5));
  const handleZoomOut = () => setScale((prev) => Math.max(prev - 0.25, 0.5));
  const handleResetZoom = () => setScale(1.0);

  if (authLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Skeleton className="h-8 w-48" />
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-[#0a0a0d] text-[#f5f3ef] overflow-hidden">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between border-b border-white/10 bg-[#0a0a0d]/95 px-6 backdrop-blur">
        <div className="flex items-center gap-4 min-w-0">
          <Link href={`/companies/${companyId}`}>
            <Button variant="ghost" size="sm" className="gap-2 text-[#9a968c] hover:text-[#f5f3ef]">
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Overview</span>
            </Button>
          </Link>
          <div className="h-4 w-px bg-white/10" />
          <div className="flex items-center gap-2.5 min-w-0">
            <FileText className="h-5 w-5 text-[#d4af6a] shrink-0" />
            <div className="min-w-0">
              <h1 className="font-semibold text-sm font-heading truncate text-[#f5f3ef]" title={docItem?.filename || "Document Viewer"}>
                {docItem?.filename || "Document Viewer"}
              </h1>
              <div className="flex items-center gap-2 text-[11px] text-[#9a968c]">
                {company && <span className="font-medium text-[#f5f3ef]">{company.name}</span>}
                {docItem?.document_type && (
                  <>
                    <span>•</span>
                    <span className="uppercase tracking-wider font-mono text-[10px] text-[#d4af6a]">
                      {docItem.document_type.replace("_", " ")}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Center Page Controls */}
        {pdfUrl && !loading && !error && (
          <div className="flex items-center gap-2 bg-[#15151c] p-1.5 rounded-xl border border-white/10 shadow-sm">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-[#9a968c] hover:text-[#f5f3ef]"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage <= 1}
              title="Previous Page"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <form onSubmit={handlePageInputSubmit} className="flex items-center gap-1.5 text-xs">
              <span className="text-[#9a968c] font-medium pl-1">Page</span>
              <input
                type="number"
                min={1}
                max={totalPages}
                value={pageInput}
                onChange={(e) => setPageInput(e.target.value)}
                onBlur={handlePageInputSubmit}
                className="w-12 h-7 rounded-md border border-white/10 bg-[#0d0d11] px-1.5 text-center text-xs font-mono font-semibold text-[#f5f3ef] focus:outline-none focus:border-[#d4af6a]"
              />
              <span className="text-[#9a968c] font-medium pr-1">of <span className="font-mono">{totalPages}</span></span>
            </form>

            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-[#9a968c] hover:text-[#f5f3ef]"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage >= totalPages}
              title="Next Page"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Right Utility Buttons */}
        {pdfUrl && !loading && !error && (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-[#15151c] p-1 rounded-lg border border-white/10 hidden md:flex">
              <Button variant="ghost" size="icon" className="h-7 w-7 text-[#9a968c] hover:text-[#f5f3ef]" onClick={handleZoomOut} title="Zoom Out">
                <ZoomOut className="h-3.5 w-3.5" />
              </Button>
              <span className="text-[11px] font-mono w-12 text-center select-none font-semibold text-[#f5f3ef]">
                {Math.round(scale * 100)}%
              </span>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-[#9a968c] hover:text-[#f5f3ef]" onClick={handleZoomIn} title="Zoom In">
                <ZoomIn className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-[#9a968c] hover:text-[#f5f3ef]" onClick={handleResetZoom} title="Reset Zoom">
                <Maximize2 className="h-3.5 w-3.5" />
              </Button>
            </div>

            <Link href={`/companies/${companyId}/research`}>
              <Button variant="outline" size="sm" className="gap-1.5 text-xs border-white/10 bg-[#15151c] text-[#f5f3ef] hover:bg-[#1c1c24] hidden lg:flex">
                <Sparkles className="h-3.5 w-3.5 text-[#d4af6a]" />
                Ask AI Research
              </Button>
            </Link>

            <a href={pdfUrl} target="_blank" rel="noopener noreferrer" download={docItem?.filename || "document.pdf"}>
              <Button size="sm" className="gap-1.5 text-xs bg-[#d4af6a] hover:bg-[#e6c584] text-white">
                <Download className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Open Original</span>
              </Button>
            </a>
          </div>
        )}
      </header>

      {/* Main Document Viewer Container */}
      <main className="flex-1 bg-[#0a0a0d] relative overflow-hidden flex flex-col items-center justify-center p-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center space-y-4 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#d4af6a]/10 text-[#d4af6a] border border-[#d4af6a]/20 shadow-inner">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
            <div className="space-y-1">
              <h3 className="font-semibold text-base font-heading text-[#f5f3ef]">Loading Document Viewer...</h3>
              <p className="text-xs text-[#9a968c]">Generating secure presigned URL and rendering PDF pages.</p>
            </div>
          </div>
        ) : error ? (
          <Card className="max-w-md w-full shadow-2xl border border-[#ef4444]/30 bg-[#15151c] text-[#f5f3ef]">
            <CardContent className="pt-6 text-center space-y-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#ef4444]/10 text-[#ef4444] border border-[#ef4444]/20 mx-auto">
                <AlertCircle className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h3 className="font-semibold text-base font-heading text-[#f5f3ef]">Unable to Display Document</h3>
                <p className="text-xs text-[#9a968c] leading-relaxed">{error}</p>
              </div>
              <div className="pt-2 flex justify-center gap-3">
                <Link href={`/companies/${companyId}`}>
                  <Button variant="outline" size="sm" className="border-white/10 bg-[#0d0d11] text-[#f5f3ef]">
                    Back to Company Overview
                  </Button>
                </Link>
                <Button size="sm" className="bg-[#d4af6a] hover:bg-[#e6c584] text-white" onClick={() => window.location.reload()}>
                  Retry
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : pdfUrl ? (
          <div className="w-full h-full flex flex-col items-center justify-center relative">
            <div
              className="w-full h-full max-w-6xl bg-[#15151c] rounded-2xl border border-white/10 shadow-2xl overflow-hidden flex flex-col transition-transform duration-150 ease-out"
              style={{
                transform: `scale(${scale})`,
                transformOrigin: "top center",
              }}
            >
              <iframe
                key={`${pdfUrl}#page=${currentPage}`}
                src={`${pdfUrl}#page=${currentPage}`}
                title={docItem?.filename || "PDF Document"}
                className="w-full h-full border-0 bg-white"
              />
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}

