'use client';

import { createContext, useContext, ReactNode, useMemo } from 'react';
import { useSocket } from '@/hooks/use-socket';

type SocketHookType = ReturnType<typeof useSocket>;

interface SocketContextType {
  actions: {
    connectSocket: SocketHookType['connectSocket'];
    clearMessages: SocketHookType['clearMessages'];
    joinRoom: SocketHookType['joinRoom'];
    leaveRoom: SocketHookType['leaveRoom'];
    sendMessage: SocketHookType['sendMessage'];
    startTyping: SocketHookType['startTyping'];
    stopTyping: SocketHookType['stopTyping'];
  };
  data: {
    isConnected: SocketHookType['isConnected'];
    connectionState: SocketHookType['connectionState'];
    lastError: SocketHookType['lastError'];
    reconnectAttempts: SocketHookType['reconnectAttempts'];
    joinedRooms: SocketHookType['joinedRooms'];
    
    realtimeMessages: SocketHookType['realtimeMessages'];
    typingUsers: SocketHookType['typingUsers'];
  };
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export function SocketProvider({ children }: { children: ReactNode }) {
  const {
    isConnected,
    connectionState,
    lastError,
    reconnectAttempts,
    joinedRooms,

    realtimeMessages,
    typingUsers,
    connectSocket,
    clearMessages,
    joinRoom,
    leaveRoom,
    sendMessage,
    startTyping,
    stopTyping,
  } = useSocket();

  const actions = useMemo(() => ({
    connectSocket,
    clearMessages,
    joinRoom,
    leaveRoom,
    sendMessage,
    startTyping,
    stopTyping,
  }), [connectSocket, clearMessages, joinRoom, leaveRoom, sendMessage, startTyping, stopTyping]);

  const data = useMemo(() => ({
    isConnected,
    connectionState,
    lastError,
    reconnectAttempts,
    joinedRooms,

    realtimeMessages,
    typingUsers,
  }), [isConnected, connectionState, lastError, reconnectAttempts, joinedRooms, realtimeMessages, typingUsers]);

  const contextValue = useMemo(() => ({ actions, data }), [actions, data]);

  return (
    <SocketContext.Provider value={contextValue}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocketContext() {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocketContext must be used within a SocketProvider');
  }
  return context;
}