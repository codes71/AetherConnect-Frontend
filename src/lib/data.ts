import type { User, Conversation } from './types';

export const users: User[] = [
  { id: 'user-1', name: 'You', avatarUrl: 'https://picsum.photos/seed/user-1/40/40', isOnline: true },
  { id: 'user-2', name: 'Alice', avatarUrl: 'https://picsum.photos/seed/user-2/40/40', isOnline: true },
  { id: 'user-3', name: 'Bob', avatarUrl: 'https://picsum.photos/seed/user-3/40/40', isOnline: false },
  { id: 'user-4', name: 'Charlie', avatarUrl: 'https://picsum.photos/seed/user-4/40/40', isOnline: true },
  { id: 'user-5', name: 'Diana', avatarUrl: 'https://picsum.photos/seed/user-5/40/40', isOnline: false },
  { id: 'user-6', name: 'Eve', avatarUrl: 'https://picsum.photos/seed/user-6/40/40', isOnline: true },
];

export const currentUser = users[0];

const conversations: Conversation[] = [
  {
    id: 'convo-1',
    type: 'dm',
    name: 'Alice',
    participants: [users[0], users[1]],
    unreadCount: 2,
    lastMessage: "Yeah, I'm free. What's up?",
    lastMessageTimestamp: '10:48 AM',
    avatarUrl: users[1].avatarUrl,
    messages: [
      { id: 'msg-1-1', text: 'Hey, are you free to chat?', sender: users[0], timestamp: '10:45 AM', read: true },
      { id: 'msg-1-2', text: "Yeah, I'm free. What's up?", sender: users[1], timestamp: '10:48 AM', read: false },
    ],
  },
  {
    id: 'convo-2',
    type: 'group',
    name: 'Project Team',
    participants: [users[0], users[2], users[3]],
    unreadCount: 1,
    lastMessage: "I'll get on it.",
    lastMessageTimestamp: 'Yesterday',
    avatarUrl: 'https://picsum.photos/seed/group-1/40/40',
    messages: [
      { id: 'msg-2-1', text: 'Hey team, we need to finalize the Q3 report.', sender: users[2], timestamp: 'Yesterday', read: true },
      { id: 'msg-2-2', text: 'Can someone take the lead on data compilation?', sender: users[2], timestamp: 'Yesterday', read: true },
      { id: 'msg-2-3', text: "I'll get on it.", sender: users[0], timestamp: 'Yesterday', read: true },
    ],
  },
  {
    id: 'convo-3',
    type: 'dm',
    name: 'Bob',
    participants: [users[0], users[2]],
    lastMessage: 'See you then!',
    lastMessageTimestamp: 'Wednesday',
    avatarUrl: users[2].avatarUrl,
    messages: [
       { id: 'msg-3-1', text: 'Lunch at 12 tomorrow?', sender: users[0], timestamp: 'Tuesday', read: true },
       { id: 'msg-3-2', text: 'Sounds good. See you then!', sender: users[2], timestamp: 'Wednesday', read: true },
    ]
  },
  {
    id: 'convo-4',
    type: 'dm',
    name: 'Charlie',
    participants: [users[0], users[3]],
    lastMessage: 'Got it, thanks!',
    lastMessageTimestamp: 'Monday',
    avatarUrl: users[3].avatarUrl,
    messages: [
      { id: 'msg-4-1', text: 'Here is the link to the document.', sender: users[3], timestamp: 'Monday', read: true },
      { id: 'msg-4-2', text: 'Got it, thanks!', sender: users[0], timestamp: 'Monday', read: true },
    ]
  },
  {
    id: 'convo-5',
    type: 'group',
    name: 'Weekend Plans',
    participants: [users[0], users[4], users[5]],
    lastMessage: "I'm in!",
    lastMessageTimestamp: 'Sunday',
    avatarUrl: 'https://picsum.photos/seed/group-2/40/40',
    messages: [
       { id: 'msg-5-1', text: 'Anyone up for a hike this weekend?', sender: users[4], timestamp: 'Sunday', read: true },
       { id: 'msg-5-2', text: "I'm in!", sender: users[0], timestamp: 'Sunday', read: true },
    ]
  },
];

export const getConversations = async (): Promise<Conversation[]> => {
  return Promise.resolve(conversations);
};

export const getConversationById = async (id: string): Promise<Conversation | undefined> => {
  return Promise.resolve(conversations.find(c => c.id === id));
};
