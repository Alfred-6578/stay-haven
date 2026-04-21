"use client";

import axios, {
  AxiosError,
  AxiosRequestConfig,
  InternalAxiosRequestConfig,
} from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "/api";

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

interface RetriableConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

let isRefreshing = false;
let pendingQueue: Array<{
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

function processQueue(error: unknown) {
  pendingQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(null);
  });
  pendingQueue = [];
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetriableConfig | undefined;

    // /auth/me intentionally NOT in this list — we want the app-load
    // "who am I" probe to also benefit from the refresh flow, otherwise
    // an expired access token leaves the user stuck in a half-logged-in
    // state (refresh cookie present, AuthContext.user = null).
    if (
      error.response?.status !== 401 ||
      !originalRequest ||
      originalRequest._retry ||
      originalRequest.url?.includes("/auth/refresh") ||
      originalRequest.url?.includes("/auth/login") ||
      originalRequest.url?.includes("/auth/register") ||
      originalRequest.url?.includes("/auth/google")
    ) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        pendingQueue.push({ resolve, reject });
      })
        .then(() => api(originalRequest as AxiosRequestConfig))
        .catch((err) => Promise.reject(err));
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      await api.post("/auth/refresh");
      processQueue(null);
      return api(originalRequest as AxiosRequestConfig);
    } catch (refreshError) {
      processQueue(refreshError);
      if (typeof window !== "undefined") {
        // Clear the auth context so logged-in UI flips to logged-out.
        // Layout guards on protected routes (guest/staff/admin) will
        // push to /login on their own — no need to hard-navigate from
        // here, and doing so kicks users off public pages like the
        // landing + browse-rooms when the "who am I" probe fails.
        window.dispatchEvent(new Event("auth:logout"));
      }
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);
