'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

interface SelectedRoomContextType {
  selectedRoomId: string | null;
  setSelectedRoomId: (id: string | null) => void;
}

const SelectedRoomContext = createContext<SelectedRoomContextType | undefined>(undefined);

export function SelectedRoomProvider({ children }: { children: ReactNode }) {
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);

  return (
    <SelectedRoomContext.Provider value={{ selectedRoomId, setSelectedRoomId }}>
      {children}
    </SelectedRoomContext.Provider>
  );
}

export function useSelectedRoom() {
  const context = useContext(SelectedRoomContext);
  if (context === undefined) {
    throw new Error('useSelectedRoom must be used within a SelectedRoomProvider');
  }
  return context;
}
