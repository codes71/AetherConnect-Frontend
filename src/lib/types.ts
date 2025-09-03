export type User = {
  id: string;
  name: string;
  email: string;
  avatarUrl: string;
  isOnline?: boolean;
};

export type Message = {
  id: string;
  content: string;
  createdAt: string;
  userId: string;
  conversationId: string;
  user?: User;
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
