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
import { currentUser } from '@/lib/data';
import { cn } from '@/lib/utils';


export function ChatAppShell({
  children,
  conversations,
}: {
  children: ReactNode;
  conversations: Conversation[];
}) {
  const pathname = usePathname();
  const { isMobile } = useSidebar();

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('');
  };

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

          <SidebarMenu className="flex-1 px-2 space-y-4">
            {conversations.map((convo) => {
              const isActive = pathname.includes(convo.id);
              return (
                <SidebarMenuItem key={convo.id} className="relative">
                  <Link href={`/chat/${convo.id}`}>
                    <SidebarMenuButton
                      isActive={isActive}
                      className="justify-start"
                      tooltip={convo.name}
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={convo.avatarUrl} alt={convo.name} />
                        <AvatarFallback>
                          {getInitials(convo.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-1 flex-col items-start text-left">
                        <span className="truncate">{convo.name}</span>
                        <span className="text-xs text-muted-foreground truncate max-w-40">
                          {convo.lastMessage}
                        </span>
                      </div>
                      {convo.unreadCount && convo.unreadCount > 0 ? (
                        <Badge className="ml-auto flex h-6 w-6 shrink-0 items-center justify-center rounded-full">
                          {convo.unreadCount}
                        </Badge>
                      ) : null}
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
                        <AvatarImage src={currentUser.avatarUrl} alt={currentUser.name} />
                        <AvatarFallback>{getInitials(currentUser.name)}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col items-start">
                        <span>{currentUser.name}</span>
                        <span className={cn("text-xs", currentUser.isOnline ? "text-green-500" : "text-muted-foreground")}>
                            {currentUser.isOnline ? "Online" : "Offline"}
                        </span>
                    </div>
                    <ChevronDown className="ml-auto h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 mb-2" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{currentUser.name}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      m@example.com
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                    <Link href="/chat/settings"><Settings className="mr-2 h-4 w-4" /><span>Settings</span></Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/login"><LogOut className="mr-2 h-4 w-4" /><span>Log out</span></Link>
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
