'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarHeader,
  SidebarInset,
  SidebarItem,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/logo';
import { ThemeToggle } from '@/components/theme-toggle';
import {
  Search,
  Settings,
  LogOut,
  Users,
  MessageSquare,
  ChevronDown,
} from 'lucide-react';
import type { Conversation } from '@/lib/types';
import { useAuth } from '@/context/auth-context';
import { useSocket } from '@/hooks/use-socket';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';
import { getConversations } from '@/lib/api';

export function ChatAppShell({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();
  const { isMobile } = useSidebar();
  const { user, logout } = useAuth();
  const { conversations, setConversations } = useSocket();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getConversations().then(response => {
      setConversations(response.data);
      setIsLoading(false);
    });
  }, [setConversations]);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('');
  };

  if (isLoading || !user) {
    return <div>Loading...</div>;
  }

  return (
    <>
      <Sidebar
        className="border-r"
        collapsible="icon"
        variant={isMobile ? 'floating' : 'sidebar'}
      >
        <SidebarContent>
          <SidebarHeader className="border-b">
            <div className="flex w-full items-center justify-between">
              <div className="flex items-center gap-2">
                <Logo />
                <span className="font-semibold">Aether Connect</span>
              </div>
              <SidebarTrigger className="md:hidden" />
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search..." className="pl-8" />
            </div>
          </SidebarHeader>

          <SidebarMenu className="flex-1 px-2 space-y-1">
            {conversations.map((convo) => {
              const isActive = pathname.includes(convo.id);
              return (
                <SidebarMenuItem key={convo.id} className="relative">
                  <Link href={`/chat/${convo.id}`} className="w-full">
                    <SidebarMenuButton
                      isActive={isActive}
                      className="justify-start h-auto py-3"
                      tooltip={{
                        children: convo.name,
                        side: 'right',
                        align: 'center',
                      }}
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={convo.avatarUrl} alt={convo.name} />
                        <AvatarFallback>
                          {getInitials(convo.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-1 flex-col items-start text-left w-0">
                        <div className="flex justify-between w-full items-center">
                          <span className="font-semibold truncate">{convo.name}</span>
                           <span className="text-xs text-muted-foreground">
                            {convo.lastMessageTimestamp}
                          </span>
                        </div>
                        <div className="flex justify-between w-full items-center">
                          <span className="text-xs text-muted-foreground truncate">
                            {convo.lastMessage}
                          </span>
                           {convo.unreadCount && convo.unreadCount > 0 ? (
                            <Badge className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full p-0">
                              {convo.unreadCount}
                            </Badge>
                          ) : null}
                        </div>
                      </div>
                    </SidebarMenuButton>
                  </Link>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
          <SidebarSeparator />
          <SidebarGroup>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="w-full justify-start gap-2 px-2">
                    <Avatar className="h-8 w-8">
                        <AvatarImage src={user.avatarUrl} alt={user.name} />
                        <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col items-start">
                        <span>{user.name}</span>
                        <span className={cn("text-xs", user.isOnline ? "text-green-500" : "text-muted-foreground")}>
                            {user.isOnline ? "Online" : "Offline"}
                        </span>
                    </div>
                    <ChevronDown className="ml-auto h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 mb-2" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user.name}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                    <Link href="/chat/settings"><Settings className="mr-2 h-4 w-4" /><span>Settings</span></Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout}>
                  <LogOut className="mr-2 h-4 w-4" /><span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>
      <SidebarInset className="flex flex-col">
        {children}
      </SidebarInset>
    </>
  );
}
