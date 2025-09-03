import { MessageSquare } from 'lucide-react';

export default function ChatHomePage() {
  return (
    <div className="flex h-full flex-col items-center justify-center bg-secondary">
      <div className="flex flex-col items-center text-center">
        <MessageSquare className="h-16 w-16 text-muted-foreground" />
        <h1 className="mt-4 text-2xl font-semibold">Welcome to Aether Connect</h1>
        <p className="mt-2 text-muted-foreground">
          Select a conversation from the sidebar to start messaging.
        </p>
      </div>
    </div>
  );
}
