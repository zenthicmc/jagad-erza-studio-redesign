"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/stores/auth-store";

export function useAuth() {
  const {
    user,
    isLoading,
    isAuthenticated,
    hasFetched,
    _hasHydrated,
    fetchUser,
    refetchUser,
    login,
    register,
    logout,
  } = useAuthStore();

  useEffect(() => {
    if (!_hasHydrated) {
      return;
    }

    if (!hasFetched) {
      fetchUser();
    }
  }, [_hasHydrated, hasFetched, fetchUser]);
  const effectiveLoading = !_hasHydrated || isLoading;

  return {
    user,
    isLoading: effectiveLoading,
    isAuthenticated,
    login,
    register,
    logout,
    refetchUser,
  };
}
