/**
 * DiligenceOS — Authenticated fetch wrapper with dual Cookie & Bearer header support.
 * Works flawlessly across local development, cross-domain deployments, and Incognito mode.
 */

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

let isRefreshing = false;
let refreshSubscribers: ((success: boolean) => void)[] = [];

function subscribeTokenRefresh(cb: (success: boolean) => void) {
  refreshSubscribers.push(cb);
}

function onRefreshed(success: boolean) {
  refreshSubscribers.forEach((cb) => cb(success));
  refreshSubscribers = [];
}

/**
 * Stores tokens securely in localStorage as a fallback for browsers blocking third-party cookies (e.g. Chrome Incognito).
 */
export function setStoredTokens(accessToken?: string | null, refreshToken?: string | null) {
  if (typeof window === "undefined") return;
  if (accessToken) {
    localStorage.setItem("diligenceos_access_token", accessToken);
  }
  if (refreshToken) {
    localStorage.setItem("diligenceos_refresh_token", refreshToken);
  }
}

export function clearStoredTokens() {
  if (typeof window === "undefined") return;
  localStorage.removeItem("diligenceos_access_token");
  localStorage.removeItem("diligenceos_refresh_token");
}

export function getStoredAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("diligenceos_access_token");
}

export function getStoredRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("diligenceos_refresh_token");
}

/**
 * Performs a refresh token request to POST /api/v1/auth/refresh.
 * Supports HttpOnly cookie & X-Refresh-Token fallback header.
 */
export async function silentRefreshToken(): Promise<boolean> {
  try {
    const refreshToken = getStoredRefreshToken();
    const headers: Record<string, string> = {};
    if (refreshToken) {
      headers["X-Refresh-Token"] = refreshToken;
    }

    const res = await fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
      method: "POST",
      headers,
      credentials: "include",
    });

    if (res.ok) {
      const data = await res.json().catch(() => null);
      if (data?.access_token) {
        setStoredTokens(data.access_token);
      }
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Custom fetch wrapper that includes both HttpOnly cookies and Bearer Authorization headers.
 * Catches HTTP 401, calls silentRefreshToken once, and retries the original request seamlessly.
 */
export async function authenticatedFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const token = getStoredAccessToken();

  // Create headers object and attach Bearer token fallback if present
  const reqHeaders = new Headers(init?.headers || {});
  if (token && !reqHeaders.has("Authorization")) {
    reqHeaders.set("Authorization", `Bearer ${token}`);
  }

  const options: RequestInit = {
    ...init,
    headers: reqHeaders,
    credentials: "include",
  };

  let res = await fetch(input, options);

  const urlStr = typeof input === "string" ? input : input.toString();
  const isAuthEndpoint = urlStr.includes("/auth/login") || urlStr.includes("/auth/refresh");

  if (res.status === 401 && !isAuthEndpoint) {
    if (!isRefreshing) {
      isRefreshing = true;
      const refreshed = await silentRefreshToken();
      isRefreshing = false;
      onRefreshed(refreshed);

      if (refreshed) {
        const retryToken = getStoredAccessToken();
        if (retryToken) {
          reqHeaders.set("Authorization", `Bearer ${retryToken}`);
        }
        return fetch(input, { ...options, headers: reqHeaders });
      }
    } else {
      const refreshed = await new Promise<boolean>((resolve) => {
        subscribeTokenRefresh(resolve);
      });

      if (refreshed) {
        const retryToken = getStoredAccessToken();
        if (retryToken) {
          reqHeaders.set("Authorization", `Bearer ${retryToken}`);
        }
        return fetch(input, { ...options, headers: reqHeaders });
      }
    }
  }

  return res;
}
