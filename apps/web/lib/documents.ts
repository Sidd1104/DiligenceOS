export type DocumentStatus = "QUEUED" | "PROCESSING" | "COMPLETED" | "FAILED";

export type DocumentItem = {
  id: string;
  company_id: string;
  filename: string;
  storage_key: string;
  document_type?: string | null;
  status: DocumentStatus;
  page_count?: number | null;
  file_size_bytes?: number | null;
  created_at: string;
  updated_at?: string | null;
};

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function uploadDocument(companyId: string, file: File): Promise<DocumentItem> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API_BASE_URL}/api/v1/companies/${companyId}/documents`, {
    method: "POST",
    body: formData,
    credentials: "include",
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Failed to upload document" }));
    if (Array.isArray(err.detail)) {
      const msg = err.detail.map((e: { msg: string }) => e.msg).join(", ");
      throw new Error(msg);
    }
    throw new Error(err.detail || "Failed to upload document");
  }

  return res.json();
}

export async function fetchCompanyDocuments(companyId: string): Promise<DocumentItem[]> {
  const res = await fetch(`${API_BASE_URL}/api/v1/companies/${companyId}/documents`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });

  if (!res.ok) {
    if (res.status === 404) {
      throw new Error("Company not found");
    }
    const err = await res.json().catch(() => ({ detail: "Failed to fetch documents" }));
    throw new Error(err.detail || "Failed to fetch documents");
  }

  return res.json();
}

export async function fetchDocument(documentId: string): Promise<DocumentItem> {
  const res = await fetch(`${API_BASE_URL}/api/v1/documents/${documentId}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });

  if (!res.ok) {
    if (res.status === 404) {
      throw new Error("Document not found");
    }
    const err = await res.json().catch(() => ({ detail: "Failed to fetch document" }));
    throw new Error(err.detail || "Failed to fetch document");
  }

  return res.json();
}
