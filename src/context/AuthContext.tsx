"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from "react";
import { api } from "@/lib/api";
import type { User, ApiResponse } from "@/types";

interface RegisterData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (data: RegisterData) => Promise<User>;
  googleLogin: (tokenData: { credential?: string; accessToken?: string }) => Promise<User>;
  logout: () => Promise<void>;
  setUser: (user: User | null) => void;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMe = useCallback(async () => {
    try {
      const res = await api.get<ApiResponse<User>>("/auth/me");
      setUser(res.data.data);
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    (async () => {
      await fetchMe();
      setLoading(false);
    })();

    const handleLogout = () => setUser(null);
    if (typeof window !== "undefined") {
      window.addEventListener("auth:logout", handleLogout);
      return () => window.removeEventListener("auth:logout", handleLogout);
    }
  }, [fetchMe]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.post<ApiResponse<{ user: User }>>("/auth/login", {
      email,
      password,
    });
    setUser(res.data.data.user);
    return res.data.data.user;
  }, []);

  const register = useCallback(async (data: RegisterData) => {
    const res = await api.post<ApiResponse<{ user: User }>>(
      "/auth/register",
      data
    );
    setUser(res.data.data.user);
    return res.data.data.user;
  }, []);

  const googleLogin = useCallback(async (tokenData: { credential?: string; accessToken?: string }) => {
    const res = await api.post<ApiResponse<{ user: User }>>(
      "/auth/google",
      tokenData
    );
    setUser(res.data.data.user);
    return res.data.data.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      // ignore
    }
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, loading, login, register, googleLogin, logout, setUser, refresh: fetchMe }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
