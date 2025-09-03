'use client';

import { useEffect, useRef, useState } from 'react';
import { useSocket } from '@/hooks/use-socket';
import { MessageInput } from '@/components/chat/message-input';
import { MessageList } from '@/components/chat/message-list';
import { useAuth } from '@/context/auth-context';
import { getMessages, getConversation } from '@/lib/api';
import { Conversation, Message } from '@/lib/types';
import { ChatHeader } from './chat-header';

interface ChatViewProps {
  conversationId: string;
}

export function ChatView({ conversationId }: ChatViewProps) {
  const { user } = useAuth();
  const {
    socket,
    joinRoom,
    leaveRoom,
    sendMessage,
    startTyping,
    stopTyping,
  } = useSocket();
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (socket) {
      socket.on('newMessage', (message: Message) => {
        if (message.conversationId === conversationId) {
          setMessages((prevMessages) => [...prevMessages, message]);
        }
      });

      return () => {
        socket.off('newMessage');
      };
    }
  }, [socket, conversationId]);


  useEffect(() => {
    const fetchConversationDetails = async () => {
      try {
        const convoResponse = await getConversation(conversationId);
        setConversation(convoResponse.data);
        const messagesResponse = await getMessages(conversationId);
        setMessages(messagesResponse.data);
      } catch (error) {
        console.error('Failed to fetch conversation details:', error);
      }
    };
    
    fetchConversationDetails();
    joinRoom(conversationId);

    return () => {
      leaveRoom(conversationId);
    };
  }, [conversationId, joinRoom, leaveRoom]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = (content: string) => {
    sendMessage(conversationId, content);
  };

  if (!user || !conversation) {
    return <div>Loading...</div>;
  }

  return (
    <div className="flex flex-col h-full">
      <ChatHeader conversation={conversation} />
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
