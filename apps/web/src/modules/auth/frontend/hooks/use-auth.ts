"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { authStore, useAuthStore } from "../store";
import { clearAccessToken, setAccessToken } from "@/shared/services/auth-session";
import {
  getPostLoginRedirectPath,
  login,
  LOGIN_ERROR_MESSAGE,
  saveSession,
  type LoginCredentials,
} from "../services";

export function useAuth() {
  const router = useRouter();
  const state = useAuthStore();

  const signIn = useCallback(
    async (credentials: LoginCredentials, remember = false) => {
      authStore.setState({ status: "loading", error: null });
      try {
        const { role, accessToken } = await login({ ...credentials, remember });
        authStore.setState({ status: "authenticated", role, accessToken });
        saveSession(accessToken, role, remember);
        setAccessToken(accessToken);
        const requestedPath = typeof window === "undefined"
          ? null
          : new URLSearchParams(window.location.search).get("next");
        router.push(getPostLoginRedirectPath(role, requestedPath));
      } catch (error) {
        clearAccessToken();
        authStore.setState({
          status: "error",
          role: null,
          accessToken: null,
          error: error instanceof Error ? error.message : LOGIN_ERROR_MESSAGE,
        });
      }
    },
    [router],
  );

  return { ...state, isLoading: state.status === "loading", signIn };
}
