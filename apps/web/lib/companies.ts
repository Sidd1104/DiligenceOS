export type Company = {
  id: string;
  workspace_id: string;
  name: string;
  industry?: string | null;
  description?: string | null;
  created_at: string;
  updated_at?: string | null;
};

export type CompanyCreatePayload = {
  name: string;
  industry?: string;
  description?: string;
};

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function fetchCompanies(): Promise<Company[]> {
  const res = await fetch(`${API_BASE_URL}/api/v1/companies`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });

  if (!res.ok) {
    if (res.status === 401) {
      throw new Error("Unauthorized");
    }
    const err = await res.json().catch(() => ({ detail: "Failed to fetch companies" }));
    throw new Error(err.detail || "Failed to fetch companies");
  }

  return res.json();
}

export async function createCompany(payload: CompanyCreatePayload): Promise<Company> {
  const res = await fetch(`${API_BASE_URL}/api/v1/companies`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    credentials: "include",
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Failed to create company" }));
    if (Array.isArray(err.detail)) {
      // Pydantic validation error array
      const msg = err.detail.map((e: { msg: string }) => e.msg).join(", ");
      throw new Error(msg);
    }
    throw new Error(err.detail || "Failed to create company");
  }

  return res.json();
}

export async function fetchCompany(id: string): Promise<Company> {
  const res = await fetch(`${API_BASE_URL}/api/v1/companies/${id}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });

  if (!res.ok) {
    if (res.status === 404) {
      throw new Error("Company not found");
    }
    const err = await res.json().catch(() => ({ detail: "Failed to fetch company" }));
    throw new Error(err.detail || "Failed to fetch company");
  }

  return res.json();
}
