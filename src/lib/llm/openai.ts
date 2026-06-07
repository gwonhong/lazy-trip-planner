import type { LlmClient, LlmMessage, LlmTool, LlmResponse } from './index'

export class OpenAiClient implements LlmClient {
  private apiKey: string
  constructor(apiKey: string) { this.apiKey = apiKey }

  async complete(messages: LlmMessage[], tools?: LlmTool[]): Promise<LlmResponse> {
    const body: Record<string, unknown> = {
      model: 'gpt-4o',
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
        ...(m.toolCallId ? { tool_call_id: m.toolCallId } : {}),
      })),
    }
    if (tools?.length) {
      body.tools = tools.map((t) => ({
        type: 'function',
        function: { name: t.name, description: t.description, parameters: t.parameters },
      }))
    }

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.apiKey}` },
      body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error(`OpenAI API error: ${res.status}`)
    const data = await res.json()
    const msg = data.choices[0].message

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
}
