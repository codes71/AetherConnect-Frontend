export type User = {
  id: string;
  username: string;
  email: string;
  roles: string[];
  firstName: string;
  lastName: string;
  createdAt: string;
  updatedAt: string;
  name?: string;
  avatarUrl?: string;
  isOnline?: boolean;
};

export type Message = {
  id: string;
  content: string;
  createdAt: string;
  userId: string;
  roomId: string; // Changed from conversationId
  messageType?: string; // Added
  status?: 'pending' | 'sent' | 'failed'; // Added
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
