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
      <div className="space-y-6">
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
              <div className={cn('flex flex-col gap-1', { 'items-end': isCurrentUser })}>
                 {showAvatar && (
                  <div className={cn("flex items-center gap-2", { "flex-row-reverse": isCurrentUser })}>
                    <Avatar className={cn('h-8 w-8', { 'invisible': !showAvatar })}>
                        <AvatarImage src={message.sender.avatarUrl} alt={message.sender.name} />
                        <AvatarFallback>{getInitials(message.sender.name)}</AvatarFallback>
                    </Avatar>
                    <span className="text-xs font-medium">{message.sender.name}</span>
                    <span className="text-xs text-muted-foreground">{message.timestamp}</span>
                  </div>
                )}
                <div
                  className={cn(
                    'max-w-xs rounded-lg p-3 text-sm md:max-w-md lg:max-w-lg',
                    {
                      'bg-primary text-primary-foreground': isCurrentUser,
                      'bg-secondary': !isCurrentUser,
                    }
                  )}
                >
                  <p>{message.text}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
