"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { API_BASE_URL, authenticatedFetch } from "./api";

export type User = {
  id: string;
  email: string;
  full_name?: string | null;
  workspace_id?: string | null;
  created_at: string;
};

type AuthContextType = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName?: string) => Promise<void>;
  logout: () => Promise<void>;
  refetchUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const refetchUser = async () => {
    try {
      const res = await authenticatedFetch(`${API_BASE_URL}/api/v1/auth/me`, {
        method: "GET",
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    authenticatedFetch(`${API_BASE_URL}/api/v1/auth/me`, {
      method: "GET",
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (isMounted) setUser(data);
      })
      .catch(() => {
        if (isMounted) setUser(null);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const login = async (email: string, password: string) => {
    const res = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
      credentials: "include",
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Invalid credentials" }));
      let detailMsg = "Invalid credentials";
      if (typeof err.detail === "string") {
        detailMsg = err.detail;
      } else if (Array.isArray(err.detail) && err.detail.length > 0) {
        detailMsg = err.detail[0].msg || err.detail[0].detail || "Invalid credentials";
      }
      throw new Error(detailMsg);
    }

    const userData = await res.json();
    setUser(userData);
  };

  const register = async (email: string, password: string, fullName?: string) => {
    const res = await fetch(`${API_BASE_URL}/api/v1/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        password,
        full_name: fullName || undefined,
      }),
      credentials: "include",
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Registration failed" }));
      let detailMsg = "Registration failed";
      if (typeof err.detail === "string") {
        detailMsg = err.detail;
      } else if (Array.isArray(err.detail) && err.detail.length > 0) {
        detailMsg = err.detail[0].msg || err.detail[0].detail || "Registration failed";
      }
      throw new Error(detailMsg);
    }

    const userData = await res.json();
    setUser(userData);
  };

  const logout = async () => {
    try {
      await fetch(`${API_BASE_URL}/api/v1/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } finally {
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        refetchUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
