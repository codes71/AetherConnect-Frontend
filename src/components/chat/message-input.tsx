"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSocketContext } from "@/context/socket-context";
import  useAuthStore  from '@/store/authStore';

import { useMessageHistory } from "@/hooks/use-message-history";

interface MessageInputProps {
  conversationId: string;
  lastMessage?: string;
}

export function MessageInput({
  conversationId,
  lastMessage,
}: MessageInputProps) {
  const { actions } = useSocketContext();
  const { user } = useAuthStore
();
  const { historyMessages } = useMessageHistory(conversationId);
  const [content, setContent] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [smartReplies, setSmartReplies] = useState<string[]>([]);
  const [isLoadingReplies, setIsLoadingReplies] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const isTypingRef = useRef(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Format conversation history for the AI prompt
  const formattedConversationHistory = historyMessages
    .map((msg) => `${msg.username}: ${msg.content}`)
    .join("\n");

  // Load smart replies when last message changes
  useEffect(() => {
    if (lastMessage && !content.trim()) {
      loadSmartReplies(lastMessage, formattedConversationHistory);
    } else {
      setSmartReplies([]);
    }
  }, [lastMessage, content, formattedConversationHistory]);

  const loadSmartReplies = async (
    message: string,
    conversationHistory: string
  ) => {
    setIsLoadingReplies(true);
    try {
      const response = await fetch("/api/smart-replies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          latestMessage: message,
          conversationHistory: conversationHistory,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setSmartReplies(data.suggestions || []);
      }
    } catch (error) {
      console.error("Failed to load smart replies:", error);
    } finally {
      setIsLoadingReplies(false);
    }
  };

  const handleSmartReply = (reply: string) => {
    setContent(reply);
    setSmartReplies([]);
    textareaRef.current?.focus();
  };

  const handleTyping = () => {
    if (!isTypingRef.current) {
      actions.startTyping(conversationId);
      isTypingRef.current = true;
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      actions.stopTyping(conversationId);
      isTypingRef.current = false;
    }, 1000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!content.trim() || isSending) return;

    const originalContent = content;
    setContent(""); // Clear immediately for better UX
    setSmartReplies([]); // Clear smart replies

    try {
      setIsSending(true);

      // Stop typing indicator
      if (isTypingRef.current) {
        actions.stopTyping(conversationId);
        isTypingRef.current = false;
      }

      // Clear typing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Send message via socket
      actions.sendMessage({
        roomId: conversationId,
        content: originalContent.trim(),
        messageType: "text",
      });
    } catch (error) {
      console.error("Failed to send message:", error);
      // Restore content on error
      setContent(originalContent);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    handleTyping();
  };

  const hasContent = content.trim().length > 0;
  const showSmartReplies = smartReplies.length > 0 && !hasContent && !isLoadingReplies;
  const showLoadingIndicator = isLoadingReplies && !hasContent;

  return (
    <div className="relative">
      {/* Fixed height container to prevent layout shifts */}
      <div className="h-16">
        <div
          className={cn(
            "border rounded-lg bg-background transition-colors h-full",
            isFocused && "ring-primary/20 shadow-sm border-primary/50"
          )}
        >
          <form onSubmit={handleSubmit} className="flex items-start gap-2 p-4 h-full">
            <div className="flex-1">
              <Textarea
                ref={textareaRef}
                value={content}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                placeholder={`Message as ${user?.username || "User"}...`}
                className="min-h-[44px] max-h-32 resize-none border-0 p-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                rows={1}
              />
            </div>
            <Button
              type="submit"
              size="sm"
              disabled={!hasContent || isSending}
              className={cn(
                "shrink-0 animate-ripple hover:animate-pulse transition-transform duration-200",
                isSending && "rotate-180"
              )}
            >
              {isSending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </form>
        </div>
      </div>

      {/* Loading indicator or Smart Reply Suggestions */}
      {(showLoadingIndicator || showSmartReplies) && (
        <div className="mt-2 animate-fade-in-up px-4 pb-4">
          {showLoadingIndicator ? (
            <div className=" animate-slide-in-up">
              <div className="flex gap-2 items-center">
                <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Generating suggestions...</span>
              </div>
            </div>
          ) : (
            <div className=" animate-slide-in-up">
              <div className="flex gap-2 items-center overflow-x-auto">
                <span className="text-xs text-muted-foreground mr-2 shrink-0">Quick replies:</span>
                <div className="flex gap-2 flex-nowrap">
                  {smartReplies.slice(0, 3).map((reply, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      size="sm"
                      onClick={() => handleSmartReply(reply)}
                      className="text-xs py-1 px-2 rounded-full hover:bg-primary hover:text-primary-foreground transition-colors animate-ripple h-7"
                      disabled={isLoadingReplies}
                    >
                      {reply.length > 20 ? `${reply.substring(0, 20)}...` : reply}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
