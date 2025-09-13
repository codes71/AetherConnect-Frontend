'use client';

import type { ReactNode } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { ThemeProvider } from '@/components/theme-provider';
import { ChatAppShell } from '@/components/chat/chat-app-shell';
import { SelectedRoomProvider } from '@/context/selected-room-context';
import { RoomProvider } from '@/context/room-context';
import { SocketProvider } from '@/context/socket-context';

export default function ChatLayout({ children }: { children: ReactNode }) {
  return (
    <RoomProvider>
      <SocketProvider>
        <ThemeProvider defaultTheme="system" enableSystem>
          <SidebarProvider>
            <SelectedRoomProvider>
              <ChatAppShell>{children}</ChatAppShell>
            </SelectedRoomProvider>
          </SidebarProvider>
        </ThemeProvider>
      </SocketProvider>
    </RoomProvider>
  );
}

