'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import api from '@/lib/api';
import { Room } from '@/lib/types';
import { useAuth } from './auth-context';

interface RoomContextType {
  rooms: Room[];
  isLoading: boolean;
  findRoomById: (id: string) => Room | undefined;
}

const RoomContext = createContext<RoomContextType | undefined>(undefined);

export function RoomProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [rooms, setRooms] = useState<Room[]>([]);
  const roomsRef = useRef(rooms);
  roomsRef.current = rooms;
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchRooms = async () => {
      setIsLoading(true);
      try {
        const response = await api.message.getRooms();
        if (response.data.success && Array.isArray(response.data.rooms)) {
          setRooms(response.data.rooms);
        } else {
          setRooms([]);
        }
      } catch (error) {
        console.error("Failed to fetch rooms:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      fetchRooms();
    } else {
      setRooms([]);
      setIsLoading(false);
    }
  }, [user]);

  const findRoomById = useCallback((id: string) => {
    return roomsRef.current.find(room => room.id === id);
  }, []);

  return (
    <RoomContext.Provider value={{ rooms, isLoading, findRoomById }}>
      {children}
    </RoomContext.Provider>
  );
}

export function useRooms() {
  const context = useContext(RoomContext);
  if (context === undefined) {
    throw new Error('useRooms must be used within a RoomProvider');
  }
  return context;
}
