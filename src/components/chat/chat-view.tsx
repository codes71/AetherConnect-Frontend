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
import { cn } from '@/lib/utils';

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
  const currentRoomRef = useRef<string | null>(null);
  const lastMessageCountRef = useRef(0);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(false);

  // Memoize room lookup
  const roomDetails = useMemo(() => {
    return findRoomById(conversationId);
  }, [findRoomById, conversationId]);

  // Handle room changes with smooth transition
  useEffect(() => {
    if (!conversationId || !isConnected) return;
    
    // Always clear messages when room changes, even if it's the same room
    if (currentRoomRef.current !== conversationId) {
      // Leave previous room
      if (currentRoomRef.current) {
        leaveRoom(currentRoomRef.current);
      }

      // Clear ALL messages immediately
      clearMessages();
      
      // Join new room
      setRoom(roomDetails || null);
      joinRoom(conversationId);
      currentRoomRef.current = conversationId;
    }
  }, [conversationId, isConnected, leaveRoom, clearMessages, joinRoom, roomDetails]);

  // Auto-scroll to bottom when messages load for new room
  useEffect(() => {
    if (historyMessages.length > 0 && !isLoadingHistory) {
      setShouldAutoScroll(true);
    }
  }, [historyMessages.length, isLoadingHistory]);

  // Update room details when room data changes
  useEffect(() => {
    setRoom(roomDetails || null);
  }, [roomDetails]);

  // Combine messages - ONLY for current room
  const allMessages = useMemo(() => {
    // Filter messages to only include current room
    const roomHistoryMessages = historyMessages.filter(msg => msg.roomId === conversationId);
    const roomRealtimeMessages = realtimeMessages.filter(msg => msg.roomId === conversationId);
    
    const combined = [...roomHistoryMessages, ...roomRealtimeMessages];
    
    // Remove duplicates by id and tempId
    const uniqueMessages = combined.filter((message, index, arr) => {
      // Keep if it's the first occurrence of this id
      const firstIndex = arr.findIndex(m => 
        (m.id && message.id && m.id === message.id) ||
        (m.tempId && message.tempId && m.tempId === message.tempId)
      );
      return firstIndex === index;
    });
    
    return uniqueMessages.sort((a, b) => 
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  }, [historyMessages, realtimeMessages, conversationId]);

  // Auto-scroll for new messages
  useEffect(() => {
    const messageCount = allMessages.length;
    if (messageCount > lastMessageCountRef.current) {
      setShouldAutoScroll(true);
    }
    lastMessageCountRef.current = messageCount;
  }, [allMessages]);

  // Get last message for smart replies
  const lastMessageForSmartReplies = useMemo(() => {
    return allMessages[allMessages.length - 1]?.content;
  }, [allMessages]);

  // Reset auto-scroll after it's been used
  useEffect(() => {
    if (shouldAutoScroll) {
      const timer = setTimeout(() => setShouldAutoScroll(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [shouldAutoScroll]);

  const handleSendMessage = useCallback((content: string) => {
    if (conversationId && content.trim()) {
      sendMessage({ roomId: conversationId, content: content.trim() });
      setShouldAutoScroll(true); // Auto-scroll when sending message
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
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="text-4xl mb-4">🔒</div>
          <p className="text-lg font-medium">Authentication Required</p>
          <p className="text-sm text-muted-foreground">Please log in to access chat.</p>
        </div>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="text-4xl mb-4">🔍</div>
          <p className="text-lg font-medium">Room not found</p>
          <p className="text-sm text-muted-foreground">The requested room could not be loaded.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Fixed Header */}
      <div className="shrink-0">
        <ChatHeader room={room} />
      </div>
      
      {/* Scrollable Messages - takes remaining space */}
      <div className="flex-1 overflow-hidden">
        <MessageList 
          messages={allMessages}
          currentUserId={user.id}
          isLoading={isLoadingHistory}
          onLoadMore={hasMore ? loadMoreHistory : undefined}
          shouldAutoScroll={shouldAutoScroll}
        />
      </div>

      {/* Fixed Input */}
      <div className="shrink-0">
        <MessageInput
          conversationId={conversationId}
          lastMessage={lastMessageForSmartReplies}
        />
      </div>
    </div>
  );
}
