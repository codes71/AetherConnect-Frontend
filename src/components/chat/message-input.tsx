'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Loader2, Paperclip, Smile, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MessageInputProps {
  onSendMessage: (content: string) => void;
  onTypingStart: () => void;
  onTypingStop: () => void;
  disabled?: boolean;
  lastMessage?: string;
}

export function MessageInput({ 
  onSendMessage, 
  onTypingStart, 
  onTypingStop, 
  disabled = false,
  lastMessage
}: MessageInputProps) {
  const [content, setContent] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [smartReplies, setSmartReplies] = useState<string[]>([]);
  const [isLoadingReplies, setIsLoadingReplies] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const isTypingRef = useRef(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load smart replies when last message changes
  useEffect(() => {
    if (lastMessage && !content.trim()) {
      loadSmartReplies(lastMessage);
    } else {
      setSmartReplies([]);
    }
  }, [lastMessage, content]);

  const loadSmartReplies = async (message: string) => {
    setIsLoadingReplies(true);
    try {
      const response = await fetch('/api/smart-replies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ latestMessage: message })
      });
      
      if (response.ok) {
        const data = await response.json();
        setSmartReplies(data.suggestions || []);
      }
    } catch (error) {
      console.error('Failed to load smart replies:', error);
    } finally {
      setIsLoadingReplies(false);
    }
  };

  const handleSmartReply = (reply: string) => {
    setContent(reply);
    setSmartReplies([]);
    textareaRef.current?.focus();
  };

  // Auto-resize textarea
  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    }
  }, []);

  useEffect(() => {
    adjustTextareaHeight();
  }, [content, adjustTextareaHeight]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setContent(value);

    // Handle typing indicators
    if (value.trim() && !isTypingRef.current) {
      isTypingRef.current = true;
      onTypingStart();
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to stop typing
    if (value.trim()) {
      typingTimeoutRef.current = setTimeout(() => {
        if (isTypingRef.current) {
          isTypingRef.current = false;
          onTypingStop();
        }
      }, 1500);
    } else if (isTypingRef.current) {
      isTypingRef.current = false;
      onTypingStop();
    }
  }, [onTypingStart, onTypingStop]);

  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault();
    
    const trimmedContent = content.trim();
    if (!trimmedContent || disabled || isSending) return;

    // Stop typing indicator immediately
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    if (isTypingRef.current) {
      isTypingRef.current = false;
      onTypingStop();
    }

    setIsSending(true);
    const originalContent = content;
    setContent(''); // Clear immediately for better UX
    setSmartReplies([]); // Clear smart replies
    
    try {
      await onSendMessage(trimmedContent);
    } catch (error) {
      console.error('Failed to send message:', error);
      setContent(originalContent); // Restore on error
    } finally {
      setIsSending(false);
    }
  }, [content, disabled, isSending, onSendMessage, onTypingStop]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }, [handleSubmit]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (isTypingRef.current) {
        onTypingStop();
      }
    };
  }, [onTypingStop]);

  const hasContent = content.trim().length > 0;
  const showSmartReplies = smartReplies.length > 0 && !hasContent;

  return (
    <div className={cn(
      "border-t bg-background transition-all duration-200",
      isFocused && "border-primary/20 shadow-sm"
    )}>
      {/* Smart Reply Suggestions - Expand container */}
      {showSmartReplies && (
        <div className="px-4 pt-3 pb-2 border-b">
          <div className="flex gap-2 flex-wrap">
            {smartReplies.slice(0, 3).map((reply, index) => (
              <Button
                key={index}
                variant="outline"
                onClick={() => handleSmartReply(reply)}
                className="text-sm py-1 px-3 rounded-full hover:bg-primary hover:text-primary-foreground transition-colors"
              >
                {reply}
              </Button>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-end gap-3 p-4 bg-background">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="mb-1 text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
          disabled={disabled}
        >
          <Paperclip className="h-4 w-4" />
        </Button>

        <div className="flex-1 relative">
          <Textarea
            ref={textareaRef}
            value={content}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={disabled ? "Connecting..." : "Type a message..."}
            disabled={disabled}
            className={cn(
              "min-h-[44px] max-h-[120px] resize-none transition-all duration-200 text-sm",
              "border-2 bg-muted/50 focus-visible:ring-2 focus-visible:ring-primary/20 rounded-2xl",
              hasContent && "bg-background border-border shadow-sm",
              isFocused && "border-primary/30 shadow-md"
            )}
            rows={1}
          />
        </div>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="mb-1 text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
          disabled={disabled}
        >
          <Smile className="h-4 w-4" />
        </Button>

        <Button 
          onClick={handleSubmit}
          disabled={!hasContent || disabled || isSending}
          size="icon"
          className={cn(
            "mb-1 transition-all duration-300 rounded-full h-11 w-11",
            hasContent 
              ? "bg-primary text-primary-foreground hover:bg-primary/90 scale-100 shadow-lg hover:shadow-xl" 
              : "bg-muted text-muted-foreground scale-90 shadow-sm"
          )}
        >
          {isSending ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Send className="h-5 w-5" />
          )}
        </Button>
      </div>
    </div>
  );
}
