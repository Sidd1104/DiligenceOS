/**
 * DiligenceOS — AI Research API Client.
 */

export type CitationItem = {
  id: string;
  chunk_id: string;
  document_id: string;
  filename?: string | null;
  page_number?: number | null;
  excerpt?: string | null;
};

export type ResearchMessageItem = {
  id: string;
  session_id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
  citations: CitationItem[];
};

export type ResearchSessionItem = {
  id: string;
  company_id: string;
  title?: string | null;
  created_at: string;
  message_count: number;
};

export type ResearchAnswerResponse = {
  session_id: string;
  message_id: string;
  answer: string;
  citations: CitationItem[];
};

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function askResearchQuestion(
  companyId: string,
  question: string,
  sessionId?: string
): Promise<ResearchAnswerResponse> {
  const res = await fetch(`${API_BASE_URL}/api/v1/companies/${companyId}/research`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, session_id: sessionId }),
    credentials: "include",
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Failed to process research question" }));
    throw new Error(err.detail || "Failed to process research question");
  }

  return res.json();
}

export async function streamResearchQuestion(
  companyId: string,
  question: string,
  sessionId: string | undefined,
  onTextDelta: (text: string) => void,
  onDone: (data: { session_id: string; message_id: string; citations: CitationItem[] }) => void,
  onError: (error: string, isAbort?: boolean) => void,
  signal?: AbortSignal
): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/api/v1/companies/${companyId}/research`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, session_id: sessionId }),
    credentials: "include",
    signal,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Failed to process research question" }));
    onError(err.detail || "Failed to process research question");
    return;
  }

  if (!res.body) {
    onError("Response body stream unavailable");
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith("data:")) {
          const jsonStr = trimmed.slice(5).trim();
          if (!jsonStr) continue;

          try {
            const data = JSON.parse(jsonStr);
            if (data.type === "text_delta" && data.text) {
              onTextDelta(data.text);
            } else if (data.type === "done") {
              onDone(data);
            } else if (data.type === "error") {
              onError(data.detail || "Stream generation error");
            }
          } catch (parseErr) {
            console.error("Failed to parse SSE event JSON:", parseErr, jsonStr);
          }
        }
      }
    }

    if (buffer.trim().startsWith("data:")) {
      const jsonStr = buffer.trim().slice(5).trim();
      if (jsonStr) {
        try {
          const data = JSON.parse(jsonStr);
          if (data.type === "text_delta" && data.text) {
            onTextDelta(data.text);
          } else if (data.type === "done") {
            onDone(data);
          } else if (data.type === "error") {
            onError(data.detail || "Stream generation error");
          }
        } catch (parseErr) {
          console.error("Failed to parse tail SSE event JSON:", parseErr);
        }
      }
    }
  } catch (err: any) {
    const isAbort = err?.name === "AbortError";
    onError(err.message || "Error reading stream", isAbort);
  }
}

export async function fetchCompanySessions(companyId: string): Promise<ResearchSessionItem[]> {
  const res = await fetch(`${API_BASE_URL}/api/v1/companies/${companyId}/research/sessions`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Failed to fetch research sessions" }));
    throw new Error(err.detail || "Failed to fetch research sessions");
  }

  return res.json();
}

export async function fetchSessionMessages(sessionId: string): Promise<ResearchMessageItem[]> {
  const res = await fetch(`${API_BASE_URL}/api/v1/research/sessions/${sessionId}/messages`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Failed to fetch session messages" }));
    throw new Error(err.detail || "Failed to fetch session messages");
  }

  return res.json();
}
