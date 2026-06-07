import type { LlmClient, LlmMessage, LlmTool, LlmResponse } from './index'

export class AnthropicClient implements LlmClient {
  private apiKey: string
  private model: string
  constructor(apiKey: string, model: string) { this.apiKey = apiKey; this.model = model }

  async complete(
    messages: LlmMessage[],
    tools?: LlmTool[],
    onToolCall?: (name: string, args: Record<string, unknown>) => Promise<string>
  ): Promise<LlmResponse> {
    const system = messages.find((m) => m.role === 'system')?.content
    // Use unknown[] so we can append content-block arrays (not just strings) as assistant turns
    let chatMessages: Array<{ role: string; content: unknown }> = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({ role: m.role === 'tool' ? 'user' : m.role, content: m.content }))

    const bodyBase: Record<string, unknown> = { model: this.model, max_tokens: 4096 }
    if (system) bodyBase.system = system
    if (tools?.length) {
      bodyBase.tools = tools.map((t) => ({
        name: t.name,
        description: t.description,
        input_schema: t.parameters,
      }))
    }

    for (let i = 0; i < 5; i++) {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({ ...bodyBase, messages: chatMessages }),
      })
      if (!res.ok) throw new Error(`Anthropic API error: ${res.status}`)
      const data = await res.json()

      const toolUse = data.content?.find((c: { type: string }) => c.type === 'tool_use')
      if (toolUse && onToolCall) {
        const result = await onToolCall(toolUse.name, toolUse.input)
        chatMessages = [
          ...chatMessages,
          { role: 'assistant', content: data.content },
          { role: 'user', content: [{ type: 'tool_result', tool_use_id: toolUse.id, content: result }] },
        ]
        continue
      }
      if (toolUse) {
        return { toolCalls: [{ id: toolUse.id, name: toolUse.name, arguments: toolUse.input }] }
      }
      return { content: data.content?.find((c: { type: string }) => c.type === 'text')?.text ?? '' }
    }
    throw new Error('Anthropic: exceeded tool call iteration limit')
  }
}
