"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface AuthUser {
  id: number;
  username: string;
  email: string;
  is_vendor: boolean;
  is_customer: boolean;
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  /**
   * False during server render and React hydration (persisted state isn't read yet).
   * Auth redirects must wait for this, or a hard refresh bounces logged-in users to /login.
   */
  hasHydrated: boolean;

  setAuth: (user: AuthUser, token: string) => void;
  logout: () => void;
  updateUser: (partial: Partial<AuthUser>) => void;
  setHasHydrated: (value: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      hasHydrated: false,

      setAuth: (user, token) => {
        if (typeof window !== "undefined") {
          // Keep "merchke_token" for the axios interceptor in api.ts
          localStorage.setItem("merchke_token", token);
        }
        set({ user, token, isAuthenticated: true });
      },

      logout: () => {
        if (typeof window !== "undefined") {
          localStorage.removeItem("merchke_token");
        }
        set({ user: null, token: null, isAuthenticated: false });
      },

      updateUser: (partial) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...partial } : null,
        })),

      setHasHydrated: (value) => set({ hasHydrated: value }),
    }),
    {
      name: "merchke-auth",
      // Only persist these keys
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => state?.setHasHydrated(true),
    }
  )
);
