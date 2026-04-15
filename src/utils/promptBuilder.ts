// src/utils/promptBuilder.ts — Constructs AI prompts for each mode

function langSuffix(answerLanguage: string): string {
  if (answerLanguage && answerLanguage !== "auto") {
    return `\n\nPlease write your explanation in ${answerLanguage}, but keep all code comments in English.`
  }
  return ""
}

function contextPrefix(customContext: string): string {
  if (customContext && customContext.trim().length > 0) {
    return `Context about me: ${customContext.trim()}\n\n`
  }
  return ""
}

/**
 * Three-stage coding pipeline — extraction + solution + debug share a common solution prompt.
 */
export function buildCodingPrompt(
  customContext: string,
  language: string,
  answerLanguage: string
): string {
  return `${contextPrefix(customContext)}You are an expert software engineer and coding interview specialist.

Analyze the coding problem visible in the screenshot and do the following:

1. **Extract the problem statement** — Identify and clearly restate the problem, constraints, and examples.
2. **Identify the optimal approach** — Explain the algorithm or data structure that yields the best time and space complexity. State your reasoning.
3. **Write a complete, working solution** in ${language}. The code must be clean, well-commented, and handle all edge cases.
4. **Complexity analysis** — Provide O(n) notation for both time and space complexity with at least two sentences explaining why.

Be thorough. Do not skip steps. Format your response in Markdown with code blocks.${langSuffix(answerLanguage)}`
}

/**
 * General mode — handles any on-screen content type automatically.
 */
export function buildGeneralPrompt(
  customContext: string,
  answerLanguage: string
): string {
  return `${contextPrefix(customContext)}You are an expert AI assistant. Examine what is visible on screen and determine the type of content:

- **Coding problem** → Provide a complete solution in the most appropriate language with explanation and complexity analysis.
- **Multiple choice question** → Identify the best answer. Explain why each option is correct or incorrect.
- **Behavioral / interview question** → Provide a structured STAR-method response (Situation, Task, Action, Result) with a concrete example.
- **Technical interview question** → Give a clear, professional, accurate answer, including relevant examples or diagrams in text.
- **Essay / writing prompt** → Provide a structured outline followed by a complete sample response.
- **General knowledge question** → Answer directly and accurately with relevant context.
- **Math / quantitative problem** → Show your work step by step, clearly labeling each stage.

Identify the content type at the start of your response. Format your entire answer in Markdown.${langSuffix(answerLanguage)}`
}

/**
 * Voice mode — conversational, real-time response to a verbal question.
 */
export function buildVoicePrompt(
  transcript: string,
  customContext: string,
  answerLanguage: string
): string {
  return `${contextPrefix(customContext)}The user asked the following question verbally:

"${transcript}"

Answer helpfully, conversationally, and concisely as if responding in real time during a live conversation.

- If this is a technical question, provide a brief but complete and accurate answer.
- If this is a behavioral question, use the STAR method concisely (2–3 sentences per component).
- If this is a general knowledge question, answer directly.
- Keep your response focused — avoid unnecessary padding.

Format your response in Markdown.${langSuffix(answerLanguage)}`
}

/**
 * Debug mode — called when processing extra screenshots after initial solution.
 */
export function buildDebugPrompt(
  customContext: string,
  language: string,
  answerLanguage: string
): string {
  return `${contextPrefix(customContext)}You are an expert software debugger. Analyze the code and error message visible on screen.

1. **Identify the root cause** — Explain exactly what is wrong and why the error occurs.
2. **Corrected code** — Provide the fully corrected solution in ${language}. Show the complete fix, not just the changed lines.
3. **Explanation** — Briefly explain the fix and any best practices it applies.

Format your response in Markdown with code blocks.${langSuffix(answerLanguage)}`
}

/**
 * Chat mode — multi-turn conversational AI with history context.
 */
export interface ChatMessage {
  role: "user" | "assistant"
  content: string
}

export function buildChatPrompt(
  message: string,
  history: ChatMessage[],
  customContext: string,
  answerLanguage: string
): string {
  // Build conversation history context
  let historyContext = ""
  if (history.length > 0) {
    const recentHistory = history.slice(-10) // Keep last 10 messages for context
    historyContext = "\n\nConversation history:\n" +
      recentHistory.map(m => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`).join("\n") +
      "\n\n"
  }

  return `${contextPrefix(customContext)}You are an expert AI assistant engaged in a conversation. Answer the user's question helpfully, accurately, and concisely.${historyContext}User: ${message}

Guidelines:
- If this is a technical/coding question, provide accurate code with explanations.
- If this is a behavioral/interview question, use the STAR method.
- If this is a general question, answer directly and clearly.
- Maintain context from the conversation history above.
- Keep responses focused and relevant.

Format your response in Markdown.${langSuffix(answerLanguage)}`
}
