'use server';

/**
 * @fileOverview An AI agent that provides smart reply suggestions based on the context of the latest message.
 *
 * - getSmartReplySuggestions - A function that generates smart reply suggestions.
 * - SmartReplySuggestionsInput - The input type for the getSmartReplySuggestions function.
 * - SmartReplySuggestionsOutput - The return type for the getSmartReplySuggestions function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SmartReplySuggestionsInputSchema = z.object({
  latestMessage: z
    .string()
    .describe('The content of the latest message in the conversation.'),
  conversationHistory: z
    .string()
    .optional()
    .describe('The history of the conversation. Optional.'),
});
export type SmartReplySuggestionsInput = z.infer<
  typeof SmartReplySuggestionsInputSchema
>;

const SmartReplySuggestionsOutputSchema = z.object({
  suggestions: z
    .array(z.string())
    .describe('An array of suggested replies based on the latest message.'),
});
export type SmartReplySuggestionsOutput = z.infer<
  typeof SmartReplySuggestionsOutputSchema
>;

export async function getSmartReplySuggestions(
  input: SmartReplySuggestionsInput
): Promise<SmartReplySuggestionsOutput> {
  console.log('🧠 Generating smart replies for:', input.latestMessage);
  try {
    const result = await smartReplySuggestionsFlow(input);
    // console.log('✅ Smart replies generated:', result.suggestions);
    return result;
  } catch (error) {
    console.error('❌ Smart reply generation failed:', error);
    throw error;
  }
}

const prompt = ai.definePrompt({
  name: 'smartReplySuggestionsPrompt',
  input: {schema: SmartReplySuggestionsInputSchema},
  output: {schema: SmartReplySuggestionsOutputSchema},
  prompt: `You are a helpful assistant that provides 3 diverse, concise, and contextually relevant smart reply suggestions based on the latest message and optional conversation history. Aim for replies that are natural, anticipate common follow-up intentions, and offer a mix of questions, affirmations, or suggestions.

  Latest message: {{{latestMessage}}}

  Conversation history (optional): {{{conversationHistory}}}

  Provide 3 distinct suggested replies. Return the suggestions as a JSON array of strings.
  Do not include any intro or explanation in your response, just the array.
  Ensure the output is a valid JSON array.
  Example: ["Sounds good!", "What's up?", "I'm on my way!"]
  `,
});

const smartReplySuggestionsFlow = ai.defineFlow(
  {
    name: 'smartReplySuggestionsFlow',
    inputSchema: SmartReplySuggestionsInputSchema,
    outputSchema: SmartReplySuggestionsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
