import { Phone, Video, MoreVertical } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import type { Room } from '@/lib/types';
import { SidebarTrigger } from '../ui/sidebar';

export function ChatHeader({ room }: { room: Room }) {

    const getInitials = (name?: string) => {
        if (!name) return '?';
        return name.split(' ').map((n) => n[0]).join('').toUpperCase();
    };

    const displayName = room.name || 'Group Chat';

    const displayAvatar = '/placeholder-avatar.png';

    const status = `${room.members?.length || 0} members`;

  return (
    <div className="flex h-16 items-center border-b bg-background px-4">
        <SidebarTrigger className="md:hidden mr-2" />
      <div className="flex items-center gap-3">
        <Avatar className="h-10 w-10 border">
          <AvatarImage src={displayAvatar} alt={displayName} />
          <AvatarFallback>{getInitials(displayName)}</AvatarFallback>
        </Avatar>
        <div className="flex flex-col">
          <span className="font-semibold">{displayName}</span>
          <span className="text-xs text-muted-foreground">{status}</span>
        </div>
      </div>
      <div className="ml-auto flex items-center gap-2">
        <Button variant="ghost" size="icon">
          <Phone className="h-5 w-5" />
          <span className="sr-only">Call</span>
        </Button>
        <Button variant="ghost" size="icon">
          <Video className="h-5 w-5" />
          <span className="sr-only">Video Call</span>
        </Button>
        <Button variant="ghost" size="icon">
          <MoreVertical className="h-5 w-5" />
          <span className="sr-only">More options</span>
        </Button>
      </div>
    </div>
  );
}
