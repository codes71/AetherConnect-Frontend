'use client';

import { Message } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface MessageListProps {
  messages: Message[];
  currentUserId: string;
}

export function MessageList({ messages, currentUserId }: MessageListProps) {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('');
  };

  return (
    <div className="flex-1 overflow-y-auto p-4">
      <div className="space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              'flex items-end gap-2',
              message.userId === currentUserId ? 'justify-end' : 'justify-start'
            )}
          >
            {message.userId !== currentUserId && (
              <Avatar className="h-8 w-8">
                <AvatarImage src={message.user?.avatarUrl} alt={message.user?.name} />
                <AvatarFallback>{getInitials(message.user?.name || '')}</AvatarFallback>
              </Avatar>
            )}
            <div
              className={cn(
                'max-w-xs rounded-lg px-4 py-2',
                message.userId === currentUserId
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted'
              )}
            >
              <p className="text-sm">{message.content}</p>
              <p className="text-xs text-muted-foreground">
                {new Date(message.createdAt).toLocaleTimeString()}
              </p>
            </div>
            {message.userId === currentUserId && (
              <Avatar className="h-8 w-8">
                <AvatarImage src={message.user?.avatarUrl} alt={message.user?.name} />
                <AvatarFallback>{getInitials(message.user?.name || '')}</AvatarFallback>
              </Avatar>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}