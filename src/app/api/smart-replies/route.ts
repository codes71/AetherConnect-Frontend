import { NextRequest, NextResponse } from 'next/server';
import { getSmartReplySuggestions } from '@/ai/flows/smart-reply-suggestions';

export async function POST(request: NextRequest) {
  try {
    const { latestMessage, conversationHistory } = await request.json();
    
    console.log('📡 Smart reply API called with:', { latestMessage, conversationHistory });
    
    const result = await getSmartReplySuggestions({
      latestMessage,
      conversationHistory
    });
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('❌ Smart reply API error:', error);
    return NextResponse.json(
      { error: 'Failed to generate smart replies' },
      { status: 500 }
    );
  }
}
