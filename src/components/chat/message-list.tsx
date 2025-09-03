
'use client';

import { useEffect, useRef } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import type { Message } from '@/lib/types';
import { currentUser } from '@/lib/data';

export function MessageList({ messages }: { messages: Message[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const getInitials = (name: string) => {
    return name.split(' ').map((n) => n[0]).join('');
  };

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto p-4">
      <div className="space-y-8">
        {messages.map((message, index) => {
          const isCurrentUser = message.sender.id === currentUser.id;
          const showAvatar = index === 0 || messages[index - 1].sender.id !== message.sender.id;

          return (
            <div
              key={message.id}
              className={cn('flex items-end gap-3', {
                'justify-end': isCurrentUser,
              })}
            >
              <div className={cn('order-2', { 'order-1': isCurrentUser })}>
                {showAvatar && (
                  <div className={cn("flex items-center gap-2 mb-2", { "flex-row-reverse": isCurrentUser })}>
                    <Avatar className="h-8 w-8">
                        <AvatarImage src={message.sender.avatarUrl} alt={message.sender.name} />
                        <AvatarFallback>{getInitials(message.sender.name)}</AvatarFallback>
                    </Avatar>
                    <span className="text-xs font-medium">{message.sender.name}</span>
                    <span className="text-xs text-muted-foreground">{message.timestamp}</span>
                  </div>
                )}
                <div
                  className={cn(
                    'max-w-prose rounded-3xl p-4 text-base shadow-lg',
                    {
                      'bg-primary text-primary-foreground rounded-br-lg': isCurrentUser,
                      'bg-secondary rounded-bl-lg': !isCurrentUser,
                    }
                  )}
                >
                  <p className="break-words">{message.text}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
