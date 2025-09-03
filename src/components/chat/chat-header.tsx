import { Phone, Video, MoreVertical, Users, User } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import type { Conversation } from '@/lib/types';
import { SidebarTrigger } from '../ui/sidebar';

export function ChatHeader({ conversation }: { conversation: Conversation }) {
    const getInitials = (name: string) => {
        return name.split(' ').map((n) => n[0]).join('');
    };

    const otherParticipant = conversation.participants?.find(p => p.id !== 'user-1');
    const status = conversation.type === 'dm' && otherParticipant 
        ? (otherParticipant.isOnline ? 'Online' : 'Offline')
        : `${conversation.participants?.length} members`;

  return (
    <div className="flex h-16 items-center border-b bg-background px-4">
        <SidebarTrigger className="md:hidden mr-2" />
      <div className="flex items-center gap-3">
        <Avatar className="h-10 w-10 border">
          <AvatarImage src={conversation.avatarUrl} alt={conversation.name} />
          <AvatarFallback>{getInitials(conversation.name)}</AvatarFallback>
        </Avatar>
        <div className="flex flex-col">
          <span className="font-semibold">{conversation.name}</span>
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
