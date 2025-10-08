'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import { useSocketContext } from '@/context/socket-context';
import { MessageInput } from '@/components/chat/message-input';
import { MessageList } from '@/components/chat/message-list';
import { Message } from '@/lib/types';
import useAuthStore from '@/store/authStore';
import { Room } from '@/lib/types';
import { ChatHeader } from './chat-header';
import { useMessageHistory } from '@/hooks/use-message-history';
import { useRooms } from '@/context/room-context';

interface ChatViewProps {
  conversationId: string;
}

export function ChatView({ conversationId }: ChatViewProps) {
  const { user } = useAuthStore();
  const {
    data: { realtimeMessages, isConnected },
    actions: { joinRoom, leaveRoom, clearMessages },
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
    
    const messageMap = new Map<string, Message>();

    // Add historical messages first
    roomHistoryMessages.forEach(msg => {
      if (msg.id) {
        messageMap.set(msg.id, msg);
      } else if (msg.tempId) {
        messageMap.set(msg.tempId, msg);
      }
    });

    // Add real-time messages, overwriting historical if IDs match
    roomRealtimeMessages.forEach(msg => {
      if (msg.id) {
        messageMap.set(msg.id, msg); // Overwrite if historical message with same ID exists
      } else if (msg.tempId) {
        messageMap.set(msg.tempId, msg); // Use tempId if no real ID yet
      }
    });
    
    return Array.from(messageMap.values()).sort((a, b) => 
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
    <div className="flex flex-col h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Fixed Header */}
      <div className="shrink-0 animate-fade-in">
        <ChatHeader room={room} />
      </div>

      {/* Scrollable Messages - takes remaining space minus input area */}
      <div className="flex-1 overflow-hidden min-h-0">
        <MessageList
          messages={allMessages}
          currentUserId={user.id}
          isLoading={isLoadingHistory}
          onLoadMore={hasMore ? loadMoreHistory : undefined}
          shouldAutoScroll={shouldAutoScroll}
        />
      </div>

      {/* Input Area - Can expand downward */}
      <div className="flex-shrink-0">
        <MessageInput
          conversationId={conversationId}
          lastMessage={lastMessageForSmartReplies}
        />
      </div>
    </div>
  );
}
