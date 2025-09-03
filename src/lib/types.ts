export type User = {
  id: string;
  name: string;
  avatarUrl: string;
  isOnline?: boolean;
};

export type Message = {
  id: string;
  text: string;
  sender: User;
  timestamp: string;
  read?: boolean;
};

export type Conversation = {
  id: string;
  type: 'dm' | 'group';
  participants?: User[];
  name: string;
  unreadCount?: number;
  lastMessage: string;
  lastMessageTimestamp: string;
  avatarUrl: string;
  messages: Message[];
};
