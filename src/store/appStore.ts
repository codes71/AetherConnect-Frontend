"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { StateCreator } from "zustand";
import { User, Room } from "@/lib/types";
import api from "@/api/api";
import { logger } from "@/lib/utils";
import { enhancedApiCall } from "@/api/api-helpers";
import { AppError, createAppError } from "@/lib/error/types";
import { AuthState, createAuthSlice } from "./authSlice"; // Import the shared slice

interface ToastOptions {
  title: string;
  description?: string;
  variant?: "default" | "destructive";
}

type ToastFn = (options: ToastOptions) => void;

interface RoomSlice {
  rooms: Room[];
  isLoading: boolean;
  fetchRooms: (toastFn?: ToastFn) => Promise<void>;
  refreshRooms: (toastFn?: ToastFn) => Promise<void>;
  findRoomById: (id: string) => Room | undefined;
}

interface SelectedRoomSlice {
  selectedRoomId: string | null;
  setSelectedRoomId: (id: string | null) => void;
}

type AppState = AuthState & RoomSlice & SelectedRoomSlice; // Use AuthState from authSlice

const createRoomSlice: StateCreator<AppState, [], [], RoomSlice> = (set, get) => ({
  rooms: [],
  isLoading: false,

  fetchRooms: async (toastFn?: ToastFn) => {
    const { user } = get();
    if (!user) {
      set({ rooms: [], isLoading: false });
      return;
    }

    set({ isLoading: true });
    try {
      const { success, data } = await enhancedApiCall<{ rooms: Room[] }>({
        apiCall: api.message.getRooms(),
        errorContext: 'rooms-fetch',
        toast: toastFn,
      });

      if (success && data && Array.isArray(data.rooms)) {
        set({ rooms: data.rooms });
      } else {
        console.warn("API response for rooms did not contain a 'rooms' array:", data);
        set({ rooms: [] });
      }
    } catch (error) {
      console.error("Failed to fetch rooms:", error);
      set({ rooms: [] });
    } finally {
      set({ isLoading: false });
    }
  },

  refreshRooms: async (toastFn?: ToastFn) => {
    await get().fetchRooms(toastFn);
  },

  findRoomById: (id: string) => {
    return get().rooms.find((room) => room.id === id);
  },
});

const createSelectedRoomSlice: StateCreator<AppState, [], [], SelectedRoomSlice> = (set) => ({
  selectedRoomId: null,

  setSelectedRoomId: (id: string | null) => set({ selectedRoomId: id }),
});

const useAppStore = create<AppState>()(
  persist(
    (...a) => ({
      ...createAuthSlice(...a),
      ...createRoomSlice(...a),
      ...createSelectedRoomSlice(...a),
    }),
    {
      name: "app-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ user: state.user, rooms: state.rooms }),
    }
  )
);

export default useAppStore;
