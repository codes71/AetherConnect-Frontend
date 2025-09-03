import { getConversationById } from '@/lib/data';
import { ChatView } from '@/components/chat/chat-view';
import { notFound } from 'next/navigation';

export default async function ConversationPage({ params }: { params: { id: string } }) {
  const conversation = await getConversationById(params.id);

  if (!conversation) {
    notFound();
  }

  return <ChatView initialConversation={conversation} />;
}
