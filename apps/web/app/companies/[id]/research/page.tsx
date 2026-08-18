"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Bot,
  Brain,
  ChevronRight,
  ExternalLink,
  FileText,
  MessageSquare,
  Plus,
  RefreshCw,
  SearchX,
  Send,
  Sparkles,
  Square,
  AlertTriangle,
  User,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { fetchCompany, Company } from "@/lib/companies";
import { fetchCompanyDocuments, DocumentItem } from "@/lib/documents";
import {
  fetchCompanySessions,
  fetchSessionMessages,
  streamResearchQuestion,
  CitationItem,
  ResearchMessageItem,
  ResearchSessionItem,
} from "@/lib/research";

// ─── Types ────────────────────────────────────────────────────────────────────

type StreamPhase = "idle" | "retrieving" | "streaming" | "done";

interface EnrichedMessage extends ResearchMessageItem {
  /** Rendered chunks for fade-in animation during live streaming */
  chunks?: string[];
  /** True when this message is a "no relevant evidence" response (REQ-RAG-05) */
  isNoEvidence?: boolean;
  /** True when stream was aborted before completion */
  isInterrupted?: boolean;
  /** Response elapsed time in milliseconds (assistant messages only) */
  elapsedMs?: number;
  /** Whether citations have faded in yet */
  citationsVisible?: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const NO_EVIDENCE_PHRASE = "could not find relevant evidence";

const SUGGESTED_QUERIES = [
  "What are the key financial highlights?",
  "Summarize top operational risk factors",
  "What is the company's annual revenue growth?",
  "What are the main regional growth initiatives?",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatElapsed(ms: number): string {
  return (ms / 1000).toFixed(1) + "s";
}

function isNoEvidenceText(text: string): boolean {
  return text.toLowerCase().includes(NO_EVIDENCE_PHRASE);
}

// ─── Sub-components ──────────────────────────────────────────────────────────

/** Radar/sonar pulse animation used during retrieval phase */
function RadarIndicator({ chunks, docs }: { chunks: number; docs: number }) {
  return (
    <div className="flex gap-4 max-w-3xl mr-auto" aria-live="polite" aria-label="Retrieving evidence">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#131b2e] border border-white/10 text-[#f8fafc]">
        <Bot className="h-4 w-4 text-[#2563eb]" />
      </div>
      <div className="rounded-2xl rounded-tl-none border border-white/10 bg-[#131b2e] px-5 py-4 shadow-sm flex items-center gap-4 transition-opacity duration-300">
        {/* Sonar rings */}
        <div className="relative flex items-center justify-center w-7 h-7 shrink-0">
          <span className="absolute inset-0 rounded-full border border-[#2563eb]/60 animate-radar-ring" />
          <span className="absolute inset-0 rounded-full border border-[#2563eb]/40 animate-radar-ring-delay-1" />
          <span className="absolute inset-0 rounded-full border border-[#2563eb]/20 animate-radar-ring-delay-2" />
          <span className="relative w-2.5 h-2.5 rounded-full bg-[#2563eb]" />
        </div>
        <div className="space-y-0.5">
          <p className="text-xs text-[#f8fafc] font-medium">
            Searching{" "}
            <span className="font-mono text-[#2563eb]">{chunks}</span> chunks across{" "}
            <span className="font-mono text-[#2563eb]">{docs}</span>{" "}
            {docs === 1 ? "document" : "documents"}…
          </p>
          <p className="text-[10px] text-[#94a3b8]">Retrieving evidence &amp; ranking by relevance</p>
        </div>
      </div>
    </div>
  );
}

/** Blinking terminal cursor rendered at the end of streaming text */
function StreamingCursor() {
  return (
    <span
      className="inline-block ml-0.5 w-[2px] h-[1.1em] align-middle bg-[#2563eb] animate-blink"
      aria-hidden="true"
    />
  );
}

/** Amber chip shown when stream was interrupted before completion */
function InterruptedChip({ onRetry }: { onRetry: () => void }) {
  return (
    <span className="inline-flex items-center gap-2 mt-2 rounded-full border border-[#f59e0b]/40 bg-[#f59e0b]/10 px-3 py-1 text-xs text-[#f59e0b] select-none">
      <AlertTriangle className="h-3 w-3 shrink-0" />
      Response interrupted
      <button
        onClick={onRetry}
        className="ml-1 flex items-center gap-1 rounded-full bg-[#f59e0b]/20 px-2 py-0.5 text-[10px] font-medium text-[#f59e0b] hover:bg-[#f59e0b]/30 active:scale-95 transition-all"
        title="Retry this question"
      >
        <RefreshCw className="h-2.5 w-2.5" />
        Retry
      </button>
    </span>
  );
}

/** "No relevant evidence" card — amber-tinted, visually distinct from a normal answer */
function NoEvidenceCard({ content }: { content: string }) {
  return (
    <div className="rounded-2xl rounded-tl-none border border-[#f59e0b]/30 bg-[#f59e0b]/8 px-5 py-4 shadow-sm space-y-2.5">
      <div className="flex items-center gap-2 text-[#f59e0b]">
        <SearchX className="h-4 w-4 shrink-0" />
        <span className="text-xs font-semibold tracking-wide uppercase font-mono">No Matching Evidence</span>
      </div>
      <p className="text-sm leading-relaxed text-[#dfe2f1] whitespace-pre-wrap">{content}</p>
      <p className="text-[10px] text-[#94a3b8] leading-relaxed">
        The system searched all processed documents and found no chunks with sufficient relevance. Try rephrasing
        your question or upload additional source documents.
      </p>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ResearchPage() {
  const params = useParams();
  const companyId = params?.id as string;

  // Data
  const [company, setCompany] = useState<Company | null>(null);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [sessions, setSessions] = useState<ResearchSessionItem[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<EnrichedMessage[]>([]);

  // Form
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Streaming state
  const [streamPhase, setStreamPhase] = useState<StreamPhase>("idle");
  /** The message ID of the currently-streaming assistant bubble */
  const streamingMsgIdRef = useRef<string | null>(null);
  /** AbortController for the active fetch stream */
  const abortControllerRef = useRef<AbortController | null>(null);
  /** Timestamp when first text_delta arrived */
  const responseStartRef = useRef<number | null>(null);
  /** Last user question, so "Retry" can re-submit it */
  const lastQuestionRef = useRef<string>("");

  // Scroll management
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const userScrolledUpRef = useRef(false);

  // Citation modal
  const [activeCitation, setActiveCitation] = useState<CitationItem | null>(null);

  const processedDocsCount = documents.filter((d) => d.status === "COMPLETED").length;

  // ── Scroll logic ─────────────────────────────────────────────────────────

  const scrollToBottom = useCallback((force = false) => {
    if (force || !userScrolledUpRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, []);

  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const wasScrolledUp = userScrolledUpRef.current;
    userScrolledUpRef.current = distanceFromBottom > 80;
    // If user scrolled back to bottom, re-enable auto-scroll
    if (wasScrolledUp && !userScrolledUpRef.current) {
      // Already at bottom — nothing to scroll
    }
  }, []);

  // ── Initial data load ─────────────────────────────────────────────────────

  useEffect(() => {
    if (!companyId) return;
    async function loadData() {
      try {
        setLoading(true);
        const [compData, docsData, sessionsData] = await Promise.all([
          fetchCompany(companyId),
          fetchCompanyDocuments(companyId).catch(() => []),
          fetchCompanySessions(companyId).catch(() => []),
        ]);
        setCompany(compData);
        setDocuments(docsData);
        setSessions(sessionsData);
        if (sessionsData.length > 0) {
          const firstSessionId = sessionsData[0].id;
          setActiveSessionId(firstSessionId);
          const initialMsgs = await fetchSessionMessages(firstSessionId).catch(() => []);
          setMessages(initialMsgs);
        }
      } catch (err: any) {
        setError(err.message || "Failed to load research assistant data");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [companyId]);

  // ── Session management ────────────────────────────────────────────────────

  const handleSelectSession = async (sessionId: string) => {
    try {
      setActiveSessionId(sessionId);
      const msgs = await fetchSessionMessages(sessionId);
      setMessages(msgs);
      scrollToBottom(true);
    } catch (err: any) {
      setError(err.message || "Failed to load session messages");
    }
  };

  const handleNewSession = () => {
    setActiveSessionId(null);
    setMessages([]);
  };

  // ── Stop generating ───────────────────────────────────────────────────────

  const handleStop = useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

  // ── Submit question ───────────────────────────────────────────────────────

  const handleSubmitQuestion = useCallback(
    async (e?: React.FormEvent, customQuestion?: string) => {
      if (e) e.preventDefault();
      const queryText = (customQuestion ?? question).trim();
      if (!queryText || streamPhase !== "idle") return;

      lastQuestionRef.current = queryText;
      setQuestion("");
      setError(null);
      userScrolledUpRef.current = false;

      const tempUserMsgId = "user-" + Date.now();
      const tempAssistantMsgId = "assistant-" + Date.now();

      const tempUserMsg: EnrichedMessage = {
        id: tempUserMsgId,
        session_id: activeSessionId || "new",
        role: "user",
        content: queryText,
        created_at: new Date().toISOString(),
        citations: [],
      };

      const tempAssistantMsg: EnrichedMessage = {
        id: tempAssistantMsgId,
        session_id: activeSessionId || "new",
        role: "assistant",
        content: "",
        created_at: new Date().toISOString(),
        citations: [],
        chunks: [],
        isNoEvidence: false,
        isInterrupted: false,
        citationsVisible: false,
      };

      streamingMsgIdRef.current = tempAssistantMsgId;
      responseStartRef.current = null;

      setMessages((prev) => [...prev, tempUserMsg, tempAssistantMsg]);
      setStreamPhase("retrieving");
      scrollToBottom();

      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        await streamResearchQuestion(
          companyId,
          queryText,
          activeSessionId || undefined,
          // onTextDelta
          (textDelta) => {
            if (!responseStartRef.current) {
              responseStartRef.current = Date.now();
              // Transition from retrieving → streaming
              setStreamPhase("streaming");
            }
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === tempAssistantMsgId
                  ? {
                      ...msg,
                      content: msg.content + textDelta,
                      chunks: [...(msg.chunks ?? []), textDelta],
                    }
                  : msg
              )
            );
            scrollToBottom();
          },
          // onDone
          async (doneData) => {
            const elapsedMs = responseStartRef.current ? Date.now() - responseStartRef.current : 0;
            const noEvidence = doneData.citations.length === 0;

            // Update message with final ID, session, citations (hidden initially)
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === tempAssistantMsgId
                  ? {
                      ...msg,
                      id: doneData.message_id,
                      session_id: doneData.session_id,
                      citations: doneData.citations || [],
                      isNoEvidence: isNoEvidenceText(msg.content),
                      isInterrupted: false,
                      elapsedMs,
                      citationsVisible: false,
                    }
                  : msg
              )
            );

            streamingMsgIdRef.current = null;
            setStreamPhase("done");

            // Stagger: reveal citations after 260ms
            setTimeout(() => {
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === doneData.message_id ? { ...msg, citationsVisible: true } : msg
                )
              );
            }, 260);

            // Reset to idle after brief visual rest
            setTimeout(() => setStreamPhase("idle"), 400);

            // Refresh sessions sidebar if new session was created
            if (!activeSessionId) {
              setActiveSessionId(doneData.session_id);
              const updatedSessions = await fetchCompanySessions(companyId).catch(() => []);
              setSessions(updatedSessions);
            }

            scrollToBottom();
          },
          // onError
          (errDetail, isAbort) => {
            const elapsedMs = responseStartRef.current ? Date.now() - responseStartRef.current : 0;
            if (isAbort) {
              // Mark the in-progress message as interrupted
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === tempAssistantMsgId
                    ? {
                        ...msg,
                        isInterrupted: true,
                        isNoEvidence: isNoEvidenceText(msg.content),
                        elapsedMs,
                        citationsVisible: false,
                      }
                    : msg
                )
              );
            } else {
              setError(errDetail || "Failed to get AI research answer");
            }
            streamingMsgIdRef.current = null;
            setStreamPhase("idle");
          },
          controller.signal
        );
      } catch (err: any) {
        setError(err.message || "Failed to get AI research answer");
        streamingMsgIdRef.current = null;
        setStreamPhase("idle");
      } finally {
        abortControllerRef.current = null;
        if (streamPhase !== "idle") setStreamPhase("idle");
      }
    },
    [question, streamPhase, activeSessionId, companyId, scrollToBottom]
  );

  const isStreaming = streamPhase === "retrieving" || streamPhase === "streaming";

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex min-h-screen flex-col bg-[#0b0f19] text-[#f8fafc]">
      {/* ── Header Bar ─────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-white/10 bg-[#0b0f19]/95 px-6 backdrop-blur">
        <div className="flex items-center gap-4">
          <Link href={`/companies/${companyId}`}>
            <Button variant="ghost" size="sm" className="gap-2 text-[#94a3b8] hover:text-[#f8fafc]">
              <ArrowLeft className="h-4 w-4" />
              Back to Overview
            </Button>
          </Link>
          <div className="h-4 w-px bg-white/10" />
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-[#2563eb]" />
            <h1 className="font-semibold text-base font-heading text-[#f8fafc]">AI Research Assistant</h1>
            {company && (
              <span className="rounded-full bg-[#2563eb]/10 px-2.5 py-0.5 text-xs font-mono text-[#2563eb] border border-[#2563eb]/20">
                {company.name}
              </span>
            )}
          </div>
        </div>
      </header>

      {/* ── Main Layout ────────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sessions Sidebar */}
        <aside className="w-72 border-r border-white/10 bg-[#0d1322] flex flex-col hidden md:flex">
          <div className="p-4 border-b border-white/10">
            <Button
              onClick={handleNewSession}
              variant="outline"
              className="w-full justify-start gap-2 border-white/10 bg-[#131b2e] text-[#f8fafc] hover:bg-[#1c273e] active:scale-[0.98] transition-all"
            >
              <Plus className="h-4 w-4 text-[#2563eb]" />
              New Research Session
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-1">
            <div className="px-2 py-1 text-[11px] font-medium text-[#94a3b8] tracking-wider uppercase font-mono">
              Past Sessions ({sessions.length})
            </div>
            {sessions.length === 0 ? (
              <div className="p-4 text-center text-xs text-[#94a3b8]">No past sessions yet</div>
            ) : (
              sessions.map((sess) => (
                <button
                  key={sess.id}
                  onClick={() => handleSelectSession(sess.id)}
                  className={`w-full text-left rounded-lg px-3 py-2.5 text-xs transition-colors flex items-center justify-between active:scale-[0.98] ${
                    activeSessionId === sess.id
                      ? "bg-[#2563eb]/15 border border-[#2563eb]/30 font-medium text-[#f8fafc]"
                      : "hover:bg-white/5 text-[#94a3b8] hover:text-[#f8fafc]"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <MessageSquare className="h-3.5 w-3.5 shrink-0 text-[#2563eb]" />
                    <span className="truncate">{sess.title || "Untitled Session"}</span>
                  </div>
                  <ChevronRight className="h-3 w-3 shrink-0 opacity-50" />
                </button>
              ))
            )}
          </div>
        </aside>

        {/* Chat Main Window */}
        <main className="flex-1 flex flex-col bg-[#0b0f19] relative overflow-hidden">
          {/* No processed documents warning */}
          {processedDocsCount === 0 && !loading && (
            <div className="bg-[#f59e0b]/10 border-b border-[#f59e0b]/20 px-6 py-3 flex items-center gap-3 text-xs text-[#f59e0b]">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <div>
                <span className="font-semibold">No processed documents available:</span> Please upload and
                process PDF documents for {company?.name || "this company"} before asking research questions.
              </div>
            </div>
          )}

          {/* ── Messages Scroll Area ─────────────────────────────────────── */}
          <div
            ref={scrollContainerRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto p-6 space-y-6"
          >
            {loading ? (
              <div className="flex flex-col items-center justify-center h-64 space-y-3 text-[#94a3b8]">
                {/* Radar during initial load */}
                <div className="relative flex items-center justify-center w-10 h-10">
                  <span className="absolute inset-0 rounded-full border border-[#2563eb]/50 animate-radar-ring" />
                  <span className="absolute inset-0 rounded-full border border-[#2563eb]/30 animate-radar-ring-delay-1" />
                  <Brain className="relative h-5 w-5 text-[#2563eb]" />
                </div>
                <p className="text-xs">Initializing research environment…</p>
              </div>
            ) : messages.length === 0 ? (
              /* Empty Chat Welcome State */
              <div className="max-w-2xl mx-auto py-12 text-center space-y-6">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#2563eb]/10 text-[#2563eb] border border-[#2563eb]/20 mx-auto shadow-inner">
                  <Sparkles className="h-8 w-8" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-semibold tracking-tight font-heading text-[#f8fafc]">
                    Financial Due Diligence Intelligence
                  </h2>
                  <p className="text-xs sm:text-sm text-[#94a3b8] max-w-md mx-auto leading-relaxed">
                    Ask questions across all processed annual reports, pitch decks, and financial statements for{" "}
                    {company?.name || "this company"}. Answers are grounded with exact document citations.
                  </p>
                </div>
                <div className="pt-4 space-y-3">
                  <p className="text-[11px] font-medium text-[#94a3b8] uppercase tracking-wider font-mono">
                    Suggested Research Queries
                  </p>
                  <div className="flex flex-wrap justify-center gap-2 max-w-lg mx-auto">
                    {SUGGESTED_QUERIES.map((chip, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSubmitQuestion(undefined, chip)}
                        className="rounded-full border border-white/10 bg-[#131b2e] px-3.5 py-1.5 text-xs text-[#f8fafc] hover:border-[#2563eb] hover:bg-[#1c273e] active:scale-95 transition-all shadow-xs"
                      >
                        {chip}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              /* ── Message Thread ───────────────────────────────────────── */
              messages.map((msg) => {
                const isLiveMsg = msg.id === streamingMsgIdRef.current;
                const isStreamingNow = isLiveMsg && streamPhase === "streaming";

                return (
                  <div
                    key={msg.id}
                    className={`flex gap-4 max-w-3xl ${
                      msg.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto"
                    }`}
                  >
                    {/* Avatar */}
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold shadow-sm ${
                        msg.role === "user"
                          ? "bg-[#2563eb] text-white"
                          : "bg-[#131b2e] border border-white/10 text-[#f8fafc]"
                      }`}
                    >
                      {msg.role === "user" ? (
                        <User className="h-4 w-4" />
                      ) : (
                        <Bot className="h-4 w-4 text-[#2563eb]" />
                      )}
                    </div>

                    {/* Message content */}
                    <div className="space-y-2 min-w-0 flex-1">
                      {msg.role === "user" ? (
                        /* User bubble */
                        <div className="rounded-2xl rounded-tr-none bg-[#2563eb] px-5 py-3.5 text-sm leading-relaxed text-white shadow-sm">
                          <p className="whitespace-pre-wrap">{msg.content}</p>
                        </div>
                      ) : msg.isNoEvidence ? (
                        /* No-evidence card (REQ-RAG-05) */
                        <NoEvidenceCard content={msg.content} />
                      ) : (
                        /* Normal assistant bubble */
                        <div className="rounded-2xl rounded-tl-none border border-white/10 bg-[#131b2e] px-5 py-3.5 text-sm leading-relaxed text-[#f8fafc] shadow-sm">
                          {isStreamingNow ? (
                            /* Live streaming: word fade-in + blinking cursor */
                            <p className="whitespace-pre-wrap">
                              {(msg.chunks ?? []).map((chunk, i) => (
                                <span
                                  key={i}
                                  className="animate-chunk-in inline"
                                  style={{ animationDelay: `${Math.min(i * 8, 60)}ms` }}
                                >
                                  {chunk}
                                </span>
                              ))}
                              <StreamingCursor />
                            </p>
                          ) : (
                            /* Completed or loaded message */
                            <p className="whitespace-pre-wrap">{msg.content}</p>
                          )}

                          {/* Interrupted chip */}
                          {msg.isInterrupted && (
                            <div className="mt-3">
                              <InterruptedChip
                                onRetry={() => handleSubmitQuestion(undefined, lastQuestionRef.current)}
                              />
                            </div>
                          )}
                        </div>
                      )}

                      {/* ── Metadata line (elapsed · sources) ─────────── */}
                      {msg.role === "assistant" &&
                        !isLiveMsg &&
                        !msg.isInterrupted &&
                        (msg.elapsedMs !== undefined || (msg.citations && msg.citations.length > 0)) && (
                          <p className="text-[11px] text-[#94a3b8] font-mono px-1">
                            {msg.elapsedMs !== undefined && (
                              <span>{formatElapsed(msg.elapsedMs)}</span>
                            )}
                            {msg.elapsedMs !== undefined &&
                              msg.citations &&
                              msg.citations.length > 0 && (
                                <span> · </span>
                              )}
                            {msg.citations && msg.citations.length > 0 && (
                              <span>{msg.citations.length} source{msg.citations.length !== 1 ? "s" : ""} reviewed</span>
                            )}
                          </p>
                        )}

                      {/* ── Citations ──────────────────────────────────── */}
                      {msg.role === "assistant" &&
                        msg.citations &&
                        msg.citations.length > 0 && (
                          <div className="rounded-xl border border-white/10 bg-[#080b14]/60 p-3.5 space-y-2 text-xs overflow-hidden">
                            <div className="flex items-center gap-1.5 font-medium text-[#94a3b8] font-mono text-[11px]">
                              <FileText className="h-3.5 w-3.5 text-[#2563eb]" />
                              Grounded Citations ({msg.citations.length})
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {msg.citations.map((cite, citeIdx) => {
                                // citationsVisible === true  → just became visible, play stagger animation
                                // citationsVisible === false → stream just ended, hidden (waiting for timeout)
                                // citationsVisible === undefined → loaded from history, show immediately
                                const citeStyle: React.CSSProperties =
                                  msg.citationsVisible === true
                                    ? {
                                        opacity: 0,
                                        animation: `citation-in 220ms ease-out ${citeIdx * 65}ms forwards`,
                                      }
                                    : msg.citationsVisible === false
                                    ? { opacity: 0 }
                                    : { opacity: 1 };

                                return (
                                  <div
                                    key={cite.id}
                                    className="flex items-center gap-1"
                                    style={citeStyle}
                                  >
                                    <Link
                                      href={`/companies/${companyId}/documents/${cite.document_id}?page=${
                                        cite.page_number || 1
                                      }`}
                                      className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-[#131b2e] px-2.5 py-1 text-xs text-[#f8fafc] hover:border-[#2563eb] hover:text-[#2563eb] active:scale-95 transition-all shadow-xs"
                                    >
                                      <span className="font-mono text-[#2563eb]">
                                        📄 Page {cite.page_number || 1}
                                      </span>
                                      <span className="text-[#94a3b8]">•</span>
                                      <span className="font-medium truncate max-w-[140px]">
                                        {cite.filename || "Document.pdf"}
                                      </span>
                                    </Link>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 px-1.5 text-[10px] text-[#94a3b8] hover:text-[#f8fafc] active:scale-95 transition-all"
                                      onClick={() => setActiveCitation(cite)}
                                      title="Quick excerpt preview"
                                    >
                                      Excerpt
                                    </Button>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                    </div>
                  </div>
                );
              })
            )}

            {/* Retrieval phase indicator (before first token) */}
            {streamPhase === "retrieving" && (
              <RadarIndicator
                chunks={processedDocsCount * 8}
                docs={processedDocsCount}
              />
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* ── Citation Preview Modal ──────────────────────────────────────── */}
          {activeCitation && (
            <div className="fixed inset-0 z-50 bg-[#0b0f19]/80 backdrop-blur-sm flex items-center justify-center p-4">
              <Card className="max-w-md w-full shadow-2xl border border-white/10 bg-[#131b2e] text-[#f8fafc]">
                <CardHeader>
                  <CardTitle className="text-base font-heading flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-[#2563eb]" />
                      Citation Excerpt Preview
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setActiveCitation(null)}
                      className="h-6 w-6 p-0 text-[#94a3b8] hover:text-[#f8fafc] active:scale-90 transition-all"
                    >
                      ✕
                    </Button>
                  </CardTitle>
                  <CardDescription className="text-xs text-[#94a3b8]">
                    {activeCitation.filename} —{" "}
                    <span className="font-mono text-[#2563eb]">Page {activeCitation.page_number}</span>
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 text-xs">
                  <div className="rounded-xl bg-[#080b14] p-3.5 italic border-l-2 border-[#2563eb] leading-relaxed text-[#f8fafc]">
                    &ldquo;{activeCitation.excerpt || "No snippet excerpt available."}&rdquo;
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setActiveCitation(null)}
                      className="border-white/10 bg-[#080b14] text-[#f8fafc] hover:bg-[#1c273e] active:scale-95 transition-all"
                    >
                      Close
                    </Button>
                    <Link
                      href={`/companies/${companyId}/documents/${activeCitation.document_id}?page=${
                        activeCitation.page_number || 1
                      }`}
                    >
                      <Button
                        variant="default"
                        size="sm"
                        className="gap-1.5 text-xs bg-[#2563eb] hover:bg-[#1d4ed8] active:scale-95 transition-all text-white"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        Open Document Viewer (Page {activeCitation.page_number})
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* ── Sticky Input Bar ────────────────────────────────────────────── */}
          <div className="p-4 border-t border-white/10 bg-[#0b0f19]">
            {/* Stop generating button — visible only while stream is active */}
            {isStreaming && (
              <div className="max-w-3xl mx-auto mb-2 flex justify-center">
                <button
                  onClick={handleStop}
                  className="flex items-center gap-2 rounded-full border border-[#f59e0b]/40 bg-[#f59e0b]/10 px-4 py-1.5 text-xs font-medium text-[#f59e0b] hover:bg-[#f59e0b]/20 active:scale-95 transition-all"
                  aria-label="Stop generating response"
                >
                  <Square className="h-3 w-3 fill-current" />
                  Stop generating
                </button>
              </div>
            )}

            <form
              onSubmit={(e) => handleSubmitQuestion(e)}
              className="max-w-3xl mx-auto flex items-end gap-3 relative"
            >
              <Textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmitQuestion();
                  }
                }}
                placeholder="Ask a question about financial results, risk factors, strategic goals..."
                disabled={isStreaming}
                className="min-h-[52px] max-h-32 resize-none pr-12 text-sm border-white/10 bg-[#080b14] text-[#f8fafc] placeholder:text-[#94a3b8]/50 focus-visible:border-[#2563eb] transition-colors"
                rows={1}
              />
              <Button
                type="submit"
                size="icon"
                disabled={isStreaming || !question.trim()}
                className="h-10 w-10 shrink-0 bg-[#2563eb] hover:bg-[#1d4ed8] active:scale-90 transition-all text-white disabled:opacity-40"
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>

            {error && (
              <p className="text-xs text-[#ef4444] text-center mt-2 font-medium">{error}</p>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
