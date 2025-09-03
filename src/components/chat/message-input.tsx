'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send } from 'lucide-react';

interface MessageInputProps {
  onSendMessage: (content: string) => void;
  onTypingStart: () => void;
  onTypingStop: () => void;
}

export function MessageInput({ onSendMessage, onTypingStart, onTypingStop }: MessageInputProps) {
  const [content, setContent] = useState('');
  let typingTimer: NodeJS.Timeout;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setContent(e.target.value);
    onTypingStart();
    clearTimeout(typingTimer);
    typingTimer = setTimeout(() => {
      onTypingStop();
    }, 2000);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (content.trim()) {
      onSendMessage(content);
      setContent('');
      onTypingStop();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <Input
        type="text"
        placeholder="Type a message..."
        value={content}
        onChange={handleInputChange}
      />
      <Button type="submit">
        <Send className="h-4 w-4" />
      </Button>
    </form>
  );
}