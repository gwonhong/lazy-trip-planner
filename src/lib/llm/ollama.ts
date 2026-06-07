import type { LlmClient, LlmMessage, LlmTool, LlmResponse } from './index'

export class OllamaClient implements LlmClient {
  private model: string
  constructor(model: string) { this.model = model }

  async complete(
    messages: LlmMessage[],
    tools?: LlmTool[],
    onToolCall?: (name: string, args: Record<string, unknown>) => Promise<string>
  ): Promise<LlmResponse> {
    let chatMessages: Array<Record<string, unknown>> = messages.map((m) => ({ role: m.role, content: m.content }))

    const bodyBase: Record<string, unknown> = { model: this.model, stream: false }
    if (tools?.length) {
      bodyBase.tools = tools.map((t) => ({
        type: 'function',
        function: { name: t.name, description: t.description, parameters: t.parameters },
      }))
    }

    for (let i = 0; i < 5; i++) {
      const res = await fetch('http://localhost:11434/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...bodyBase, messages: chatMessages }),
      })
      if (!res.ok) throw new Error(`Ollama API error: ${res.status}`)
      const data = await res.json()
      const msg = data.message

      if (msg.tool_calls?.length && onToolCall) {
        chatMessages = [...chatMessages, msg]
        for (const tc of msg.tool_calls) {
          const args = typeof tc.function.arguments === 'string'
            ? JSON.parse(tc.function.arguments)
            : tc.function.arguments
          const result = await onToolCall(tc.function.name, args)
          chatMessages.push({ role: 'tool', content: result })
        }
        continue
      }
      if (msg.tool_calls?.length) {
        return {
          toolCalls: msg.tool_calls.map(
            (tc: { function: { name: string; arguments: unknown } }, idx: number) => ({
              id: `ollama-${idx}`,
              name: tc.function.name,
              arguments: typeof tc.function.arguments === 'string'
                ? JSON.parse(tc.function.arguments)
                : tc.function.arguments,
            })
          ),
        }
      }
      return { content: msg.content ?? '' }
    }
    throw new Error('Ollama: exceeded tool call iteration limit')
  }
}
