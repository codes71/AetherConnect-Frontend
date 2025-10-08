import { ReactNode } from 'react'
import { cn } from '@/lib/utils';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarHeader,
  SidebarInset,
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
import {
  Search,
  LogOut,
  ChevronDown,
} from 'lucide-react';
import { useRooms } from '@/context/room-context';
import { useRouter } from 'next/navigation';
import { useSelectedRoom } from '@/context/selected-room-context';

import useAuthStore from '@/store/authStore';
export function ChatAppShell({
  children,
}: {
  children: ReactNode;
}) {
  const { isMobile } = useSidebar();
  const { user, logout, isLoading: isAuthLoading } = useAuthStore();
  const { rooms, isLoading: areRoomsLoading } = useRooms();
  const { selectedRoomId, setSelectedRoomId } = useSelectedRoom();
  const router = useRouter();

  if (isAuthLoading || areRoomsLoading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    // You can render a login button or a redirect here
    return <div>Please log in to continue.</div>;
  }

  const name = user.username;
  const initials = name.substring(0, 2).toUpperCase();

  return (
    <>
      <Sidebar
        className="border-r"
        collapsible={isMobile ? "offcanvas" : "icon"}
        variant={isMobile ? 'floating' : 'sidebar'}
      >
        <SidebarContent>
          <SidebarHeader className="border-b p-4 text-white">
            <div className="flex w-full items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Logo />
                <span className="font-semibold text-lg">Aether Connect</span>
              </div>
              {isMobile && <SidebarTrigger />}
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-white/80" />
              <Input placeholder="Search conversations..." className="pl-10 h-10 bg-white/10 text-white placeholder-white/70 border-white/20" />
            </div>
          </SidebarHeader>

          <SidebarMenu className="flex-1 px-3 py-2 space-y-1">
            {rooms.map((room) => {
              const isActive = selectedRoomId === room.id;
              return (
                <SidebarMenuItem key={room.id} className="relative" onClick={() => setSelectedRoomId(room.id)}>
                    <SidebarMenuButton
                      isActive={isActive}
                      className={cn(
                        "justify-start h-auto py-4 px-3 rounded-lg transition-all duration-200",
                        isActive && "ring-2 ring-primary/30 shadow-md"
                      )}
                      tooltip={{
                        children: room.name,
                        side: 'right',
                        align: 'center',
                      }}
                    >
                      <Avatar className="h-12 w-12 shrink-0 hover:scale-105 transition-transform duration-200">
                        <AvatarFallback className="text-sm font-medium">
                          {room.name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-1 flex-col items-start text-left min-w-0 ml-3">
                        <div className="flex justify-between w-full items-center">
                          <span className="font-medium truncate text-sm">{room.name}</span>
                           <span className="text-xs text-muted-foreground shrink-0">
                            {/* Display last message timestamp here */}
                          </span>
                        </div>
                        <div className="flex justify-between w-full items-center mt-1">
                          <span className="text-xs text-muted-foreground truncate">
                            {room.members?.length || 0} members
                          </span>
                           {/* Display unread count here */}
                        </div>
                      </div>
                    </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
          <SidebarSeparator />
          <SidebarGroup>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="w-full justify-start gap-2 px-2">
                    <Avatar className="h-8 w-8 hover:scale-105 transition-transform duration-200">
                        <AvatarImage src={undefined} alt={name} />
                        <AvatarFallback>{initials}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col items-start">
                        <span>{name}</span>
                    </div>
                    <ChevronDown className="ml-auto h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 mb-2" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{name}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                    {/* <Link href="/chat/settings"><Settings className="mr-2 h-4 w-4" /><span>Settings</span></Link> */}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => logout({ redirect: true, routerPush: router.push })}>
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
