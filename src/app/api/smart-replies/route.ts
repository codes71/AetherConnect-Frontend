import { getSmartReplySuggestions } from '@/ai/flows/smart-reply-suggestions';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { latestMessage, conversationHistory } = await req.json();

    if (!latestMessage) {
      return NextResponse.json({ error: 'latestMessage is required' }, { status: 400 });
    }

    const suggestions = await getSmartReplySuggestions({ latestMessage, conversationHistory });
    return NextResponse.json(suggestions);
  } catch (error) {
    console.error('Error generating smart replies:', error);
    return NextResponse.json({ error: 'Failed to generate smart replies' }, { status: 500 });
  }
}
