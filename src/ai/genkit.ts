import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

if (process.env.NODE_ENV !== 'production') {
  console.log('🤖 Initializing Genkit with Google AI...');
  console.log('📋 Environment check:', {
    hasGoogleApiKey: !!process.env.GOOGLE_GENAI_API_KEY,
    nodeEnv: process.env.NODE_ENV
  });
}

export const ai = genkit({
  plugins: [googleAI()],
  model: 'googleai/gemini-2.0-flash',
});

if (process.env.NODE_ENV !== 'production') {
  console.log('✅ Genkit initialized successfully');
}
