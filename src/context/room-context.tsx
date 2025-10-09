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
import { useAuth } from "@/context/auth-context";
import { Room } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { getRooms } from "@/lib/api";

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
      const response = await getRooms();

      if (response.success && response.rooms) {
        setRooms(response.rooms);
      } else {
        console.error("Failed to fetch rooms:", response.message);
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

  return <RoomContext.Provider value={value}>{children}</RoomContext.Provider>;
}

export function useRooms() {
  const context = useContext(RoomContext);
  if (context === undefined) {
    throw new Error("useRooms must be used within a RoomProvider");
  }
  return context;
}
