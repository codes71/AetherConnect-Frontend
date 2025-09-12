'use client';

import { useMemo, useCallback, useRef, useEffect } from 'react';
import { Message } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Loader2, Check, CheckCheck, Clock } from 'lucide-react';

interface MessageListProps {
  messages: Message[];
  currentUserId: string;
  isLoading?: boolean;
  onLoadMore?: () => void;
}

export function MessageList({ 
  messages, 
  currentUserId, 
  isLoading = false,
  onLoadMore 
}: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const getInitials = useCallback((name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase();
  }, []);

  const getMessageStatusIcon = useCallback((message: Message) => {
    if (message.userId !== currentUserId) return null;
    
    switch (message.status) {
      case 'pending':
        return <Clock className="h-3 w-3 text-gray-400" />;
      case 'sent':
        return <Check className="h-3 w-3 text-gray-400" />;
      default:
        return null;
    }
  }, [currentUserId]);

  // Group messages by date
  const groupedMessages = useMemo(() => {
    const groups: { date: string; messages: Message[] }[] = [];
    
    messages.forEach((message) => {
      const messageDate = new Date(message.createdAt).toDateString();
      const lastGroup = groups[groups.length - 1];
      
      if (lastGroup && lastGroup.date === messageDate) {
        lastGroup.messages.push(message);
      } else {
        groups.push({
          date: messageDate,
          messages: [message]
        });
      }
    });
    
    return groups;
  }, [messages]);

  // Intersection Observer for load more
  useEffect(() => {
    if (!onLoadMore || !loadMoreRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isLoading) {
          onLoadMore();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [onLoadMore, isLoading]);

  // Auto-scroll to bottom for new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  if (messages.length === 0 && !isLoading) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        <div className="text-center">
          <div className="text-4xl mb-4">💬</div>
          <p className="text-lg font-medium">No messages yet</p>
          <p className="text-sm">Be the first to say hello!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-2">
      {/* Load more trigger */}
      {onLoadMore && (
        <div ref={loadMoreRef} className="flex justify-center py-4">
          {isLoading ? (
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          ) : (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onLoadMore}
              className="text-gray-500"
            >
              Load more messages
            </Button>
          )}
        </div>
      )}

      {/* Messages */}
      <div className="space-y-6">
        {groupedMessages.map((group) => (
          <div key={group.date}>
            {/* Date separator */}
            <div className="flex items-center justify-center py-2">
              <div className="bg-gray-100 text-gray-600 text-xs px-3 py-1 rounded-full">
                {new Date(group.date).toLocaleDateString(undefined, {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </div>
            </div>

            {/* Messages for this date */}
            <div className="space-y-2">
              {group.messages.map((message, index) => {
                const isOwn = message.userId === currentUserId;
                const showAvatar = !isOwn && (
                  index === 0 || 
                  group.messages[index - 1]?.userId !== message.userId
                );

                return (
                  <div
                    key={message.id}
                    className={cn(
                      'flex gap-2 group',
                      isOwn ? 'justify-end' : 'justify-start'
                    )}
                  >
                    {/* Avatar for others */}
                    {!isOwn && (
                      <div className="flex-shrink-0">
                        {showAvatar ? (
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={`/avatars/${message.userId}.png`} />
                            <AvatarFallback className="text-xs">
                              {getInitials(message.username)}
                            </AvatarFallback>
                          </Avatar>
                        ) : (
                          <div className="w-8" />
                        )}
                      </div>
                    )}

                    {/* Message bubble */}
                    <div className={cn(
                      'flex flex-col max-w-[70%]',
                      isOwn ? 'items-end' : 'items-start'
                    )}>
                      {/* Username (for others, when showing avatar) */}
                      {!isOwn && showAvatar && (
                        <div className="text-xs text-gray-600 mb-1 px-3">
                          {message.username}
                        </div>
                      )}

                      {/* Message content */}
                      <div
                        className={cn(
                          'px-4 py-2 rounded-lg break-words',
                          isOwn
                            ? 'bg-blue-500 text-white rounded-br-sm'
                            : 'bg-gray-100 text-gray-900 rounded-bl-sm',
                          message.status === 'pending' && 'opacity-70'
                        )}
                      >
                        <p className="text-sm">{message.content}</p>
                      </div>

                      {/* Timestamp and status */}
                      <div className={cn(
                        'flex items-center gap-1 px-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity',
                        isOwn ? 'flex-row-reverse' : 'flex-row'
                      )}>
                        <span className="text-xs text-gray-500">
                          {new Date(message.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                        {getMessageStatusIcon(message)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div ref={messagesEndRef} />
    </div>
  );
}
