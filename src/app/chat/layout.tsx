import type { ReactNode } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { ThemeProvider } from '@/components/theme-provider';
// import {ChatHomePage} from '@/app/chat/page';
import { ChatAppShell } from '@/components/chat/chat-app-shell';

export default async function ChatLayout({ children }: { children: ReactNode }) {

  return (
      <ThemeProvider defaultTheme="system" enableSystem>
        <SidebarProvider>
          <ChatAppShell>{children}</ChatAppShell>
        </SidebarProvider>
      </ThemeProvider>
  );
}
