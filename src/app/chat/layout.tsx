import type { ReactNode } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { ChatAppShell } from '@/components/chat/chat-app-shell';
import { getConversations } from '@/lib/data';

export default async function ChatLayout({ children }: { children: ReactNode }) {
  const conversations = await getConversations();

  return (
    <SidebarProvider>
      <ChatAppShell conversations={conversations}>{children}</ChatAppShell>
    </SidebarProvider>
  );
}
