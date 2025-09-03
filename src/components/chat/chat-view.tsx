'use client';

import { useState } from 'react';
import type { Conversation, Message } from '@/lib/types';
import { currentUser } from '@/lib/data';
import { ChatHeader } from './chat-header';
import { MessageList } from './message-list';
import { MessageInput } from './message-input';

export function ChatView({ initialConversation }: { initialConversation: Conversation }) {
  const [conversation, setConversation] = useState(initialConversation);

  const handleSendMessage = (text: string) => {
    const newMessage: Message = {
      id: `msg-${Date.now()}`,
      text,
      sender: currentUser,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      read: true,
    };
    setConversation(prev => ({
      ...prev,
      messages: [...prev.messages, newMessage],
    }));
  };

  return (
    <div className="flex h-full flex-col">
      <ChatHeader conversation={conversation} />
      <MessageList messages={conversation.messages} />
      <MessageInput onSendMessage={handleSendMessage} conversation={conversation} />
    </div>
  );
}
