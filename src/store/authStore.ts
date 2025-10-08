"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { AuthState, createAuthSlice } from "./authSlice"; // Import the shared slice

const useAuthStore = create(
  persist(createAuthSlice, {
    name: "auth-storage",
    storage: createJSONStorage(() => localStorage),
    partialize: (state) => ({ user: state.user }),
  })
);

export default useAuthStore;
