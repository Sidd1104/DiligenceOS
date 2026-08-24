/**
 * DiligenceOS — Authenticated fetch wrapper with automatic silent token refresh on HTTP 401.
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
 * Performs a refresh token request to POST /api/v1/auth/refresh.
 * Returns true if successful, false otherwise.
 */
export async function silentRefreshToken(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
      method: "POST",
      credentials: "include",
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Custom fetch wrapper that automatically catches 401 (Access Token Expired),
 * calls /api/v1/auth/refresh once, and retries the original request seamlessly.
 */
export async function authenticatedFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const options: RequestInit = {
    ...init,
    credentials: "include",
  };

  let res = await fetch(input, options);

  // If request failed with 401 and it's not an auth login/refresh request itself
  const urlStr = typeof input === "string" ? input : input.toString();
  const isAuthEndpoint = urlStr.includes("/auth/login") || urlStr.includes("/auth/refresh");

  if (res.status === 401 && !isAuthEndpoint) {
    if (!isRefreshing) {
      isRefreshing = true;
      const refreshed = await silentRefreshToken();
      isRefreshing = false;
      onRefreshed(refreshed);

      if (refreshed) {
        return fetch(input, options);
      }
    } else {
      // Queue concurrent requests while refresh is in progress
      const refreshed = await new Promise<boolean>((resolve) => {
        subscribeTokenRefresh(resolve);
      });

      if (refreshed) {
        return fetch(input, options);
      }
    }
  }

  return res;
}
