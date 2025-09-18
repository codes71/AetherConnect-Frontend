'use client';

import { useMemo, useCallback, useRef, useEffect } from 'react';
import { Message } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Loader2, Check, CheckCheck, Clock, AlertCircle } from 'lucide-react';

interface MessageListProps {
  messages: Message[];
  currentUserId: string;
  isLoading?: boolean;
  onLoadMore?: () => void;
  shouldAutoScroll?: boolean;
}

export function MessageList({ 
  messages, 
  currentUserId, 
  isLoading = false,
  onLoadMore,
  shouldAutoScroll = false
}: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const getInitials = useCallback((name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase();
  }, []);

  const getMessageStatusIcon = useCallback((message: Message) => {
    if (message.userId !== currentUserId) return null;
    
    // If message doesn't have a status field, it's a historical message from server
    // Historical messages are already delivered, so either show no icon or "delivered" status
    if (!message.status) {
      // Option 1: No icon for historical messages (recommended)
      return null;
      
      // Option 2: Show delivered status for historical messages
      // return <CheckCheck className="h-3 w-3 text-blue-500" />;
    }
    
    switch (message.status) {
      case 'sending':
        return <Clock className="h-3 w-3 text-muted-foreground animate-pulse" />;
      case 'sent':
        return <Check className="h-3 w-3 text-muted-foreground" />;
      case 'confirmed':
        return <CheckCheck className="h-3 w-3 text-blue-500" />;
      case 'failed':
        return <AlertCircle className="h-3 w-3 text-red-500" />;
      default:
        return null; // Changed from Clock icon to null for unknown statuses
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

  // Auto-scroll to bottom only when shouldAutoScroll is true
  useEffect(() => {
    if (shouldAutoScroll && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [shouldAutoScroll]);

  // Intersection Observer for load more
  useEffect(() => {
    if (!onLoadMore || !loadMoreRef.current) return;

    // Add delay to prevent immediate triggering when component mounts
    const timer = setTimeout(() => {
      if (!loadMoreRef.current) return;
      
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
    }, 1000); // 1 second delay

    return () => clearTimeout(timer);
  }, [onLoadMore, isLoading]);

  if (messages.length === 0 && !isLoading) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <div className="text-center animate-fade-in">
          <div className="text-6xl mb-4 opacity-50">💬</div>
          <p className="text-lg font-medium">No messages yet</p>
          <p className="text-sm">Be the first to say hello!</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className="h-full overflow-y-auto px-4 py-2 scroll-smooth"
    >
      {/* Load more trigger */}
      {onLoadMore && (
        <div ref={loadMoreRef} className="flex justify-center py-4">
          {isLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Loading messages...</span>
            </div>
          ) : (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onLoadMore}
              className="text-muted-foreground hover:text-foreground transition-colors duration-200"
            >
              Load more messages
            </Button>
          )}
        </div>
      )}

      {/* Messages */}
      <div className="space-y-4">
        {groupedMessages.map((group, groupIndex) => (
          <div key={group.date} className="animate-fade-in-up" style={{ animationDelay: `${groupIndex * 50}ms` }}>
            {/* Date separator */}
            <div className="flex items-center justify-center py-3">
              <div className="bg-muted/80 text-muted-foreground text-xs font-medium px-4 py-2 rounded-full border shadow-sm">
                {new Date(group.date).toLocaleDateString(undefined, {
                  weekday: 'short',
                  month: 'short',
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
                    key={message.id || message.tempId}
                    className={cn(
                      'flex gap-2 group animate-slide-in-up transition-all duration-200',
                      isOwn ? 'justify-end' : 'justify-start'
                    )}
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    {/* Avatar for others */}
                    {!isOwn && (
                      <div className="flex-shrink-0">
                        {showAvatar ? (
                          <Avatar className="h-8 w-8 transition-transform duration-200 hover:scale-105">
                            <AvatarFallback className="text-xs bg-muted">
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
                      'flex flex-col max-w-[70%] transition-all duration-200',
                      isOwn ? 'items-end' : 'items-start'
                    )}>
                      {/* Username (for others, when showing avatar) */}
                      {!isOwn && showAvatar && (
                        <div className="text-xs font-medium text-muted-foreground mb-1 px-3">
                          {message.username}
                        </div>
                      )}

                      {/* Message content */}
                      <div
                        className={cn(
                          'px-4 py-3 rounded-2xl break-words transition-all duration-200 hover:shadow-md max-w-sm',
                          isOwn
                            ? 'bg-primary text-primary-foreground rounded-br-md ml-auto'
                            : 'bg-card text-card-foreground rounded-bl-md border shadow-sm',
                          message.status === 'sending' && 'opacity-70 animate-pulse',
                          message.status === 'failed' && 'bg-destructive/10 border-destructive/20 text-destructive'
                        )}
                      >
                        <p className="text-sm leading-relaxed font-medium">{message.content}</p>
                      </div>

                      {/* Timestamp and status */}
                      <div className={cn(
                        'flex items-center gap-1 px-1 mt-1 transition-all duration-200',
                        isOwn ? 'flex-row-reverse' : 'flex-row'
                      )}>
                        <span className="text-xs text-muted-foreground">
                          {new Date(message.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                        {/* Status icon - only show if it exists */}
                        {getMessageStatusIcon(message) && (
                          <div className="flex-shrink-0">
                            {getMessageStatusIcon(message)}
                          </div>
                        )}
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
