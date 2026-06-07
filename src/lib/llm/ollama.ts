import type { LlmClient, LlmMessage, LlmTool, LlmResponse } from './index'

export class OllamaClient implements LlmClient {
  private model: string
  constructor(model: string) { this.model = model }

  async complete(messages: LlmMessage[], tools?: LlmTool[]): Promise<LlmResponse> {
    const body: Record<string, unknown> = {
      model: this.model,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      stream: false,
    }
    if (tools?.length) {
      body.tools = tools.map((t) => ({
        type: 'function',
        function: { name: t.name, description: t.description, parameters: t.parameters },
      }))
    }

    const res = await fetch('http://localhost:11434/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error(`Ollama API error: ${res.status}`)
    const data = await res.json()
    const msg = data.message

    if (msg.tool_calls?.length) {
      return {
        toolCalls: msg.tool_calls.map(
          (tc: { function: { name: string; arguments: unknown } }, i: number) => ({
            id: `ollama-${i}`,
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
}
