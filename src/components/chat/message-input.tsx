'use client';

import { useState, useEffect } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Paperclip, Send, Bot, Loader2 } from 'lucide-react';
import { getSmartReplySuggestions } from '@/ai/flows/smart-reply-suggestions';
import { useToast } from '@/hooks/use-toast';
import type { Conversation } from '@/lib/types';
import { currentUser } from '@/lib/data';

interface MessageInputProps {
  onSendMessage: (text: string) => void;
  conversation: Conversation;
}

export function MessageInput({ onSendMessage, conversation }: MessageInputProps) {
  const [text, setText] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const { toast } = useToast();

  const lastMessage = conversation.messages[conversation.messages.length - 1];

  useEffect(() => {
    // Only fetch suggestions if the last message is not from the current user
    if (lastMessage && lastMessage.sender.id !== currentUser.id) {
      setIsLoading(true);
      getSmartReplySuggestions({
        latestMessage: lastMessage.text,
      })
        .then((res) => {
          setSuggestions(res.suggestions);
        })
        .catch(() => {
          toast({
            variant: 'destructive',
            title: 'AI Error',
            description: 'Could not fetch smart reply suggestions.',
          });
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
        setSuggestions([]);
    }
  }, [lastMessage, toast]);


  const handleSend = () => {
    if (text.trim()) {
      onSendMessage(text.trim());
      setText('');
      setSuggestions([]);
      setIsTyping(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    onSendMessage(suggestion);
    setSuggestions([]);
    setIsTyping(false);
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    if (!isTyping) {
        setIsTyping(true);
    }
    // As per user request, suspend suggestions when user is typing.
    if(suggestions.length > 0) {
        setSuggestions([]);
    }
  };


  return (
    <div className="border-t bg-background p-4">
      {!isTyping && (
        <div className="mb-2 flex items-center gap-2">
          {isLoading ? (
            <div className="flex items-center text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              <span>Generating replies...</span>
            </div>
          ) : suggestions.length > 0 ? (
            <>
              <Bot className="h-5 w-5 text-muted-foreground" />
              {suggestions.map((s) => (
                <Button
                  key={s}
                  variant="outline"
                  size="sm"
                  onClick={() => handleSuggestionClick(s)}
                >
                  {s}
                </Button>
              ))}
            </>
          ) : null}
        </div>
      )}

      <div className="relative">
        <Textarea
          placeholder="Type a message..."
          className="pr-24"
          value={text}
          onChange={handleInputChange}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
        />
        <div className="absolute bottom-2 right-2 flex items-center gap-2">
          <Button variant="ghost" size="icon">
            <Paperclip className="h-5 w-5" />
            <span className="sr-only">Attach file</span>
          </Button>
          <Button size="icon" onClick={handleSend} disabled={!text.trim()}>
            <Send className="h-5 w-5" />
            <span className="sr-only">Send</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
