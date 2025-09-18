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
  tempId?: string; // ← FIXED: Make optional to match usage
  content: string;
  createdAt: string;
  userId: string;
  username: string; // ← ADDED: Missing from your type but used in socket
  roomId: string;
  messageType?: string;
  status?: 'sending' | 'sent' | 'confirmed' | 'failed'; // ← FIXED: Align with socket usage
  user?: User;
  metadata?: Record<string, unknown>; // ← ADDED: For future extensibility
};

export type Room = {
  id: string;
  name: string;
  description: string;
  roomType: 'public' | 'private' | 'direct'; // ← ADDED: 'direct' for DMs
  createdBy: string;
  members: string[]; // Array of user IDs
  createdAt: string;
  updatedAt: string;
  unreadCount?: number; // ← ADDED: For UI state
  lastActivity?: string; // ← ADDED: For sorting
};

export type Conversation = {
  id: string;
  type: 'dm' | 'group';
  participants: string[]; // ← CHANGED: Align with Room.members structure
  name: string;
  unreadCount?: number;
  lastMessage: string;
  lastMessageTimestamp: string;
  avatarUrl?: string;
  messages?: Message[]; // ← CHANGED: Make optional since messages loaded separately
};
