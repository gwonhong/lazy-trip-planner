import type { LlmClient, LlmMessage, LlmTool, LlmResponse } from './index'

export class AnthropicClient implements LlmClient {
  private apiKey: string
  private model: string
  constructor(apiKey: string, model: string) { this.apiKey = apiKey; this.model = model }

  async complete(messages: LlmMessage[], tools?: LlmTool[]): Promise<LlmResponse> {
    const system = messages.find((m) => m.role === 'system')?.content
    const chatMessages = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({ role: m.role === 'tool' ? 'user' : m.role, content: m.content }))

    const body: Record<string, unknown> = {
      model: this.model,
      max_tokens: 4096,
      messages: chatMessages,
    }
    if (system) body.system = system
    if (tools?.length) {
      body.tools = tools.map((t) => ({
        name: t.name,
        description: t.description,
        input_schema: t.parameters,
      }))
    }

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error(`Anthropic API error: ${res.status}`)
    const data = await res.json()

    const toolUse = data.content?.find((c: { type: string }) => c.type === 'tool_use')
    if (toolUse) {
      return { toolCalls: [{ id: toolUse.id, name: toolUse.name, arguments: toolUse.input }] }
    }
    return { content: data.content?.find((c: { type: string }) => c.type === 'text')?.text ?? '' }
  }
}
