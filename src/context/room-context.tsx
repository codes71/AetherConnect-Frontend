"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
  useRef,
} from "react";
import api from "@/api/api";
import { Room } from "@/lib/types";
import { useAuth } from "./auth-context";
import { enhancedApiCall } from "@/api/api-helpers";

interface RoomContextType {
  rooms: Room[];
  isLoading: boolean;
  findRoomById: (id: string) => Room | undefined;
  refreshRooms: () => Promise<void>;
}

const RoomContext = createContext<RoomContextType | undefined>(undefined);

export function RoomProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [rooms, setRooms] = useState<Room[]>([]);
  const roomsRef = useRef(rooms);
  roomsRef.current = rooms;
  const [isLoading, setIsLoading] = useState(true);

  const fetchRooms = useCallback(async () => {
    if (!user) {
      setRooms([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const { success, data } = await enhancedApiCall({
        apiCall: api.message.getRooms(),
        errorContext: 'rooms-fetch',
        suppressErrorToast: true,
      });

      if (success && Array.isArray(data)) {
        setRooms(data);
      } else {
        setRooms([]);
      }
    } catch (error) {
      console.error("Failed to fetch rooms:", error);
      setRooms([]);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const refreshRooms = useCallback(async () => {
    await fetchRooms();
  }, [fetchRooms]);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  const findRoomById = useCallback((id: string) => {
    return roomsRef.current.find((room) => room.id === id);
  }, []);

  const value: RoomContextType = {
    rooms,
    isLoading,
    findRoomById,
    refreshRooms,
  };

  return (
    <RoomContext.Provider value={value}>
      {children}
    </RoomContext.Provider>
  );
}

export function useRooms() {
  const context = useContext(RoomContext);
  if (context === undefined) {
    throw new Error("useRooms must be used within a RoomProvider");
  }
  return context;
}