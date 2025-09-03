'use client';

import { useEffect, useRef } from 'react';
import { useSocket } from '@/hooks/use-socket';
import { MessageInput } from '@/components/chat/message-input';
import { MessageList } from '@/components/chat/message-list';
import { useAuth } from '@/context/auth-context';

interface ChatViewProps {
  conversationId: string;
}

export function ChatView({ conversationId }: ChatViewProps) {
  const { user } = useAuth();
  const {
    messages,
    joinRoom,
    leaveRoom,
    sendMessage,
    startTyping,
    stopTyping,
    clearMessages,
  } = useSocket();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    clearMessages();
    joinRoom(conversationId);

    return () => {
      leaveRoom(conversationId);
    };
  }, [conversationId, joinRoom, leaveRoom, clearMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = (content: string) => {
    sendMessage(conversationId, content);
  };

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <div className="flex flex-col h-full">
      <MessageList messages={messages} currentUserId={user.id} />
      <div ref={messagesEndRef} />
      <div className="mt-auto p-4">
        <MessageInput
          onSendMessage={handleSendMessage}
          onTypingStart={() => startTyping(conversationId)}
          onTypingStop={() => stopTyping(conversationId)}
        />
      </div>
    </div>
  );
}