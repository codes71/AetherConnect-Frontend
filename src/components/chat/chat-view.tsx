'use client';

import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { useSocketContext } from '@/context/socket-context';
import { MessageInput } from '@/components/chat/message-input';
import { MessageList } from '@/components/chat/message-list';
import { useAuth } from '@/context/auth-context';
import { Room } from '@/lib/types';
import { ChatHeader } from './chat-header';
import { useMessageHistory } from '@/hooks/use-message-history';
import { useRooms } from '@/context/room-context';

interface ChatViewProps {
  conversationId: string;
}

export function ChatView({ conversationId }: ChatViewProps) {
  const { user } = useAuth();
  const {
    data: { realtimeMessages, isConnected },
    actions: { joinRoom, leaveRoom, sendMessage, startTyping, stopTyping, clearMessages },
  } = useSocketContext();
  
  const { historyMessages, isLoadingHistory, loadMoreHistory, hasMore } = useMessageHistory(conversationId);
  const { findRoomById } = useRooms();
  
  const [room, setRoom] = useState<Room | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const currentRoomRef = useRef<string | null>(null);

  // Memoize room lookup
  const roomDetails = useMemo(() => {
    return findRoomById(conversationId);
  }, [findRoomById, conversationId]);

  // Handle room changes - FIXED: Remove unstable dependencies
  useEffect(() => {
    if (!conversationId || !isConnected) return;

    // Only change rooms if it's actually different
    if (currentRoomRef.current === conversationId) return;

    // Leave previous room
    if (currentRoomRef.current) {
      leaveRoom(currentRoomRef.current);
    }

    // Join new room
    setRoom(roomDetails || null);
    clearMessages();
    joinRoom(conversationId);
    currentRoomRef.current = conversationId;

    // Cleanup on unmount only
    return () => {
      if (currentRoomRef.current) {
        leaveRoom(currentRoomRef.current);
        currentRoomRef.current = null;
      }
    };
  }, [conversationId, isConnected]); // ← Only stable dependencies

  // Update room details when room data changes
  useEffect(() => {
    setRoom(roomDetails || null);
  }, [roomDetails]);

  // Combine messages
  const allMessages = useMemo(() => {
    const combined = [...historyMessages, ...realtimeMessages];
    const uniqueMessages = Array.from(new Set(combined.map(m => m.id)))
      .map(id => combined.find(m => m.id === id)!)
      .filter(Boolean);
    
    return uniqueMessages.sort((a, b) => 
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  }, [historyMessages, realtimeMessages]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [allMessages]);

  // Stable event handlers
  const handleSendMessage = useCallback((content: string) => {
    if (conversationId && content.trim()) {
      sendMessage({ roomId: conversationId, content: content.trim() });
    }
  }, [conversationId, sendMessage]);

  const handleTypingStart = useCallback(() => {
    if (conversationId) {
      startTyping(conversationId);
    }
  }, [conversationId, startTyping]);

  const handleTypingStop = useCallback(() => {
    if (conversationId) {
      stopTyping(conversationId);
    }
  }, [conversationId, stopTyping]);

  if (!user) {
    return <div className="flex items-center justify-center h-full">Please log in to access chat.</div>;
  }

  if (!room) {
    return <div className="flex items-center justify-center h-full">Room not found or loading...</div>;
  }

  return (
    <div className="flex flex-col h-full">
      <ChatHeader room={room} />
      
      <div className="flex-1 overflow-hidden">
        <MessageList 
          messages={allMessages}
          currentUserId={user.id}
          isLoading={isLoadingHistory}
          onLoadMore={hasMore ? loadMoreHistory : undefined}
        />
        <div ref={messagesEndRef} />
      </div>

      <MessageInput
        onSendMessage={handleSendMessage}
        onTypingStart={handleTypingStart}
        onTypingStop={handleTypingStop}
        disabled={!isConnected}
      />
    </div>
  );
}
