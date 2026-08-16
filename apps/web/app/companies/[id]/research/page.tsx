"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Bot,
  Brain,
  Building2,
  CheckCircle2,
  ChevronRight,
  FileText,
  HelpCircle,
  History,
  Loader2,
  MessageSquare,
  Plus,
  Send,
  Sparkles,
  User,
  AlertTriangle,
  ExternalLink,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { fetchCompany, Company } from "@/lib/companies";
import { fetchCompanyDocuments, DocumentItem } from "@/lib/documents";
import {
  askResearchQuestion,
  fetchCompanySessions,
  fetchSessionMessages,
  CitationItem,
  ResearchMessageItem,
  ResearchSessionItem,
} from "@/lib/research";

export default function ResearchPage() {
  const params = useParams();
  const router = useRouter();
  const companyId = params?.id as string;

  const [company, setCompany] = useState<Company | null>(null);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [sessions, setSessions] = useState<ResearchSessionItem[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ResearchMessageItem[]>([]);
  
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeCitation, setActiveCitation] = useState<CitationItem | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, sending]);

  // Load initial data
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

  // Handle switching research sessions
  const handleSelectSession = async (sessionId: string) => {
    try {
      setActiveSessionId(sessionId);
      const msgs = await fetchSessionMessages(sessionId);
      setMessages(msgs);
    } catch (err: any) {
      setError(err.message || "Failed to load session messages");
    }
  };

  // Start new session
  const handleNewSession = () => {
    setActiveSessionId(null);
    setMessages([]);
  };

  // Submit question
  const handleSubmitQuestion = async (e?: React.FormEvent, customQuestion?: string) => {
    if (e) e.preventDefault();
    const queryText = customQuestion || question;
    if (!queryText.trim() || sending) return;

    const currentQ = queryText.trim();
    setQuestion("");
    setSending(true);
    setError(null);

    // Optimistically add user message to UI
    const tempUserMsg: ResearchMessageItem = {
      id: "temp-user-" + Date.now(),
      session_id: activeSessionId || "new",
      role: "user",
      content: currentQ,
      created_at: new Date().toISOString(),
      citations: [],
    };

    setMessages((prev) => [...prev, tempUserMsg]);

    try {
      const res = await askResearchQuestion(companyId, currentQ, activeSessionId || undefined);
      
      if (!activeSessionId) {
        setActiveSessionId(res.session_id);
        // Refresh session list
        const updatedSessions = await fetchCompanySessions(companyId).catch(() => []);
        setSessions(updatedSessions);
      }

      const assistantMsg: ResearchMessageItem = {
        id: res.message_id,
        session_id: res.session_id,
        role: "assistant",
        content: res.answer,
        created_at: new Date().toISOString(),
        citations: res.citations || [],
      };

      setMessages((prev) => [...prev.filter((m) => m.id !== tempUserMsg.id), tempUserMsg, assistantMsg]);
    } catch (err: any) {
      setError(err.message || "Failed to get AI research answer");
    } finally {
      setSending(false);
    }
  };

  const processedDocsCount = documents.filter((d) => d.status === "COMPLETED").length;

  return (
    <div className="flex min-h-screen flex-col bg-[#0b0f19] text-[#f8fafc]">
      {/* Header Bar */}
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

      {/* Main Content Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sessions Sidebar */}
        <aside className="w-72 border-r border-white/10 bg-[#0d1322] flex flex-col hidden md:flex">
          <div className="p-4 border-b border-white/10">
            <Button
              onClick={handleNewSession}
              variant="outline"
              className="w-full justify-start gap-2 border-white/10 bg-[#131b2e] text-[#f8fafc] hover:bg-[#1c273e]"
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
              <div className="p-4 text-center text-xs text-[#94a3b8]">
                No past sessions yet
              </div>
            ) : (
              sessions.map((sess) => (
                <button
                  key={sess.id}
                  onClick={() => handleSelectSession(sess.id)}
                  className={`w-full text-left rounded-lg px-3 py-2.5 text-xs transition-colors flex items-center justify-between ${
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
          {/* Document Status Warning Banner if 0 processed docs */}
          {processedDocsCount === 0 && !loading && (
            <div className="bg-[#f59e0b]/10 border-b border-[#f59e0b]/20 px-6 py-3 flex items-center gap-3 text-xs text-[#f59e0b]">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <div>
                <span className="font-semibold">No processed documents available:</span> Please upload and process PDF documents for {company?.name || "this company"} before asking research questions.
              </div>
            </div>
          )}

          {/* Messages Scroll Area */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-64 space-y-3 text-[#94a3b8]">
                <Loader2 className="h-8 w-8 animate-spin text-[#2563eb]" />
                <p className="text-xs">Initializing research environment...</p>
              </div>
            ) : messages.length === 0 ? (
              /* Empty Chat Welcome State */
              <div className="max-w-2xl mx-auto py-12 text-center space-y-6">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#2563eb]/10 text-[#2563eb] border border-[#2563eb]/20 mx-auto shadow-inner">
                  <Sparkles className="h-8 w-8" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-semibold tracking-tight font-heading text-[#f8fafc]">Financial Due Diligence Intelligence</h2>
                  <p className="text-xs sm:text-sm text-[#94a3b8] max-w-md mx-auto leading-relaxed">
                    Ask questions across all processed annual reports, pitch decks, and financial statements for {company?.name || "this company"}. Answers are grounded with exact document citations.
                  </p>
                </div>

                {/* Starter Question Chips */}
                {processedDocsCount > 0 && (
                  <div className="pt-4 space-y-3">
                    <p className="text-[11px] font-medium text-[#94a3b8] uppercase tracking-wider font-mono">
                      Suggested Research Queries
                    </p>
                    <div className="flex flex-wrap justify-center gap-2 max-w-lg mx-auto">
                      {[
                        "What are the key financial highlights?",
                        "Summarize top operational risk factors",
                        "What is the company's annual revenue growth?",
                        "What are the main regional growth initiatives?",
                      ].map((chip, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSubmitQuestion(undefined, chip)}
                          className="rounded-full border border-white/10 bg-[#131b2e] px-3.5 py-1.5 text-xs text-[#f8fafc] hover:border-[#2563eb] hover:bg-[#1c273e] transition-all shadow-xs"
                        >
                          {chip}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Message Thread List */
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-4 max-w-3xl ${
                    msg.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto"
                  }`}
                >
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold shadow-sm ${
                      msg.role === "user"
                        ? "bg-[#2563eb] text-white"
                        : "bg-[#131b2e] border border-white/10 text-[#f8fafc]"
                    }`}
                  >
                    {msg.role === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4 text-[#2563eb]" />}
                  </div>

                  <div className="space-y-3 min-w-0 flex-1">
                    <div
                      className={`rounded-2xl px-5 py-3.5 text-sm leading-relaxed shadow-sm ${
                        msg.role === "user"
                          ? "bg-[#2563eb] text-white rounded-tr-none"
                          : "bg-[#131b2e] border border-white/10 text-[#f8fafc] rounded-tl-none"
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    </div>

                    {/* Citations List for Assistant Messages */}
                    {msg.role === "assistant" && msg.citations && msg.citations.length > 0 && (
                      <div className="rounded-xl border border-white/10 bg-[#080b14]/60 p-3.5 space-y-2 text-xs">
                        <div className="flex items-center gap-1.5 font-medium text-[#94a3b8] font-mono text-[11px]">
                          <FileText className="h-3.5 w-3.5 text-[#2563eb]" />
                          Grounded Citations ({msg.citations.length})
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {msg.citations.map((cite) => (
                            <div key={cite.id} className="flex items-center gap-1">
                              <Link
                                href={`/companies/${companyId}/documents/${cite.document_id}?page=${cite.page_number || 1}`}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-[#131b2e] px-2.5 py-1 text-xs text-[#f8fafc] hover:border-[#2563eb] hover:text-[#2563eb] transition-colors shadow-xs"
                              >
                                <span className="font-mono text-[#2563eb]">📄 Page {cite.page_number || 1}</span>
                                <span className="text-[#94a3b8]">•</span>
                                <span className="font-medium truncate max-w-[140px]">
                                  {cite.filename || "Document.pdf"}
                                </span>
                              </Link>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-1.5 text-[10px] text-[#94a3b8] hover:text-[#f8fafc]"
                                onClick={() => setActiveCitation(cite)}
                                title="Quick excerpt preview"
                              >
                                Excerpt
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}

            {/* Sending Indicator */}
            {sending && (
              <div className="flex gap-4 max-w-3xl mr-auto">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#131b2e] border border-white/10 text-[#f8fafc]">
                  <Bot className="h-4 w-4 text-[#2563eb]" />
                </div>
                <div className="rounded-2xl rounded-tl-none border border-white/10 bg-[#131b2e] p-4 shadow-sm flex items-center gap-3">
                  <Loader2 className="h-4 w-4 animate-spin text-[#2563eb]" />
                  <span className="text-xs text-[#94a3b8]">
                    Retrieving evidence & synthesizing response...
                  </span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Citation Preview Modal */}
          {activeCitation && (
            <div className="fixed inset-0 z-50 bg-[#0b0f19]/80 backdrop-blur-sm flex items-center justify-center p-4">
              <Card className="max-w-md w-full shadow-2xl border border-white/10 bg-[#131b2e] text-[#f8fafc]">
                <CardHeader>
                  <CardTitle className="text-base font-heading flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-[#2563eb]" />
                      Citation Excerpt Preview
                    </span>
                    <Button variant="ghost" size="sm" onClick={() => setActiveCitation(null)} className="h-6 w-6 p-0 text-[#94a3b8]">
                      ✕
                    </Button>
                  </CardTitle>
                  <CardDescription className="text-xs text-[#94a3b8]">
                    {activeCitation.filename} — <span className="font-mono text-[#2563eb]">Page {activeCitation.page_number}</span>
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 text-xs">
                  <div className="rounded-xl bg-[#080b14] p-3.5 italic border-l-2 border-[#2563eb] leading-relaxed text-[#f8fafc]">
                    "{activeCitation.excerpt || "No snippet excerpt available."}"
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => setActiveCitation(null)} className="border-white/10 bg-[#080b14] text-[#f8fafc]">
                      Close
                    </Button>
                    <Link
                      href={`/companies/${companyId}/documents/${activeCitation.document_id}?page=${activeCitation.page_number || 1}`}
                    >
                      <Button variant="default" size="sm" className="gap-1.5 text-xs bg-[#2563eb] hover:bg-[#1d4ed8] text-white">
                        <ExternalLink className="h-3.5 w-3.5" />
                        Open Document Viewer (Page {activeCitation.page_number})
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Sticky Input Bar */}
          <div className="p-4 border-t border-white/10 bg-[#0b0f19]">
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
                placeholder={
                  processedDocsCount === 0
                    ? "Upload documents first to start research..."
                    : "Ask a question about financial results, risk factors, strategic goals..."
                }
                disabled={sending || processedDocsCount === 0}
                className="min-h-[52px] max-h-32 resize-none pr-12 text-sm border-white/10 bg-[#080b14] text-[#f8fafc] placeholder:text-[#94a3b8]/50 focus-visible:border-[#2563eb]"
                rows={1}
              />
              <Button
                type="submit"
                size="icon"
                disabled={sending || !question.trim() || processedDocsCount === 0}
                className="h-10 w-10 shrink-0 bg-[#2563eb] hover:bg-[#1d4ed8] text-white"
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
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

