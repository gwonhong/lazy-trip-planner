import type { LlmClient, LlmMessage, LlmTool, LlmResponse } from './index'

export class OpenAiClient implements LlmClient {
  private apiKey: string
  private model: string
  constructor(apiKey: string, model: string) { this.apiKey = apiKey; this.model = model }

  async complete(
    messages: LlmMessage[],
    tools?: LlmTool[],
    onToolCall?: (name: string, args: Record<string, unknown>) => Promise<string>
  ): Promise<LlmResponse> {
    let chatMessages: Array<Record<string, unknown>> = messages.map((m) => ({
      role: m.role,
      content: m.content,
      ...(m.toolCallId ? { tool_call_id: m.toolCallId } : {}),
    }))

    const bodyBase: Record<string, unknown> = { model: this.model }
    if (tools?.length) {
      bodyBase.tools = tools.map((t) => ({
        type: 'function',
        function: { name: t.name, description: t.description, parameters: t.parameters },
      }))
    }

    for (let i = 0; i < 5; i++) {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.apiKey}` },
        body: JSON.stringify({ ...bodyBase, messages: chatMessages }),
      })
      if (!res.ok) throw new Error(`OpenAI API error: ${res.status}`)
      const data = await res.json()
      const msg = data.choices[0].message

      if (msg.tool_calls?.length && onToolCall) {
        // Append the raw assistant message (which carries tool_calls) then each tool result
        chatMessages = [...chatMessages, msg]
        for (const tc of msg.tool_calls) {
          const result = await onToolCall(tc.function.name, JSON.parse(tc.function.arguments))
          chatMessages.push({ role: 'tool', tool_call_id: tc.id, content: result })
        }
        continue
      }
      if (msg.tool_calls?.length) {
        return {
          toolCalls: msg.tool_calls.map((tc: { id: string; function: { name: string; arguments: string } }) => ({
            id: tc.id,
            name: tc.function.name,
            arguments: JSON.parse(tc.function.arguments),
          })),
        }
      }
      return { content: msg.content ?? '' }
    }
    throw new Error('OpenAI: exceeded tool call iteration limit')
  }
}
