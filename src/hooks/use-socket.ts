'use client';

import { useEffect, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import Cookies from 'js-cookie';
import { Message, Conversation } from '@/lib/types';
import { useAuth } from '@/context/auth-context';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';

export function useSocket() {
  const { isAuthenticated } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      const newSocket = io(SOCKET_URL, {
        auth: {
          token: `${Cookies.get('token')}`,
        },
      });

      newSocket.on('connect', () => {
        setIsConnected(true);
      });

      newSocket.on('disconnect', () => {
        setIsConnected(false);
      });

      newSocket.on('typing', (username: string) => {
        setTypingUsers((prev) => [...prev, username]);
      });

      newSocket.on('stopTyping', (username: string) => {
        setTypingUsers((prev) => prev.filter((u) => u !== username));
      });

      setSocket(newSocket);

      return () => {
        newSocket.disconnect();
      };
    }
  }, [isAuthenticated]);

  const joinRoom = useCallback((roomId: string) => {
    socket?.emit('joinRoom', roomId);
  }, [socket]);

  const leaveRoom = useCallback((roomId: string) => {
    socket?.emit('leaveRoom', roomId);
  }, [socket]);

  const sendMessage = useCallback((roomId: string, content: string) => {
    socket?.emit('sendMessage', { roomId, content });
  }, [socket]);

  const startTyping = useCallback((roomId: string) => {
    socket?.emit('startTyping', roomId);
  }, [socket]);

  const stopTyping = useCallback((roomId: string) => {
    socket?.emit('stopTyping', roomId);
  }, [socket]);

  return {
    socket,
    typingUsers,
    isConnected,
    joinRoom,
    leaveRoom,
    sendMessage,
    startTyping,
    stopTyping,
    conversations,
    setConversations,
  };
}
