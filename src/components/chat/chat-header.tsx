import { Phone, Video, MoreVertical, Wifi, WifiOff, Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import type { Room } from '@/lib/types';
import { SidebarTrigger } from '../ui/sidebar';
import { useSocketContext } from '@/context/socket-context';
import { cn } from '@/lib/utils';

export function ChatHeader({ room }: { room: Room }) {
  const { 
    data: { isConnected, connectionState, typingUsers }
  } = useSocketContext();

  const getInitials = (name?: string) => {
    if (!name) return '?';
    return name.split(' ').map((n) => n[0]).join('').toUpperCase();
  };

  const displayName = room.name || 'Group Chat';
  const memberCount = room.members?.length || 0;

  const getConnectionStatus = () => {
    switch (connectionState) {
      case 'connected':
        return { icon: Wifi, color: 'text-green-500' };
      case 'connecting':
        return { icon: Loader2, color: 'text-yellow-500' };
      default:
        return { icon: WifiOff, color: 'text-red-500' };
    }
  };

  const connectionStatus = getConnectionStatus();
  const ConnectionIcon = connectionStatus.icon;
  const typingArray = Array.from(typingUsers);

  return (
    <div className="flex h-16 items-center border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 shrink-0 animate-fade-in">
      <SidebarTrigger className="md:hidden mr-3" />
      
      <Avatar className="h-10 w-10 mr-4 ring-2 ring-background shadow-sm">
        <AvatarFallback className="font-semibold text-sm bg-gradient-to-br from-primary/20 to-primary/10">
          {getInitials(displayName)}
        </AvatarFallback>
      </Avatar>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold truncate text-base animate-fade-in">{displayName}</span>
          <ConnectionIcon 
            className={cn(
              "h-4 w-4",
              connectionStatus.color,
              connectionState === 'connecting' && "animate-spin"
            )} 
          />
        </div>
        <div className="text-sm text-muted-foreground font-medium">
          {typingArray.length > 0 ? (
            <span className="text-primary animate-pulse">
              {typingArray.length === 1 ? `${typingArray[0]} is typing...` : `${typingArray.length} people typing...`}
            </span>
          ) : (
            `${memberCount} ${memberCount === 1 ? 'member' : 'members'}`
          )}
        </div>
      </div>

      <div className="flex gap-1">
        <Button variant="ghost" size="icon" className="h-9 w-9 hover:bg-muted/80" disabled={!isConnected}>
          <Phone className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-9 w-9 hover:bg-muted/80" disabled={!isConnected}>
          <Video className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-9 w-9 hover:bg-muted/80">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
