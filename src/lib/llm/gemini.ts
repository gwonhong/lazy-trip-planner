import type { LlmClient, LlmMessage, LlmTool, LlmResponse } from './index'

export class GeminiClient implements LlmClient {
  constructor(private apiKey: string) {}

  async complete(messages: LlmMessage[], tools?: LlmTool[]): Promise<LlmResponse> {
    const system = messages.find((m) => m.role === 'system')?.content
    const contents = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }))

    const body: Record<string, unknown> = { contents }
    if (system) body.systemInstruction = { parts: [{ text: system }] }
    if (tools?.length) {
      body.tools = [{
        functionDeclarations: tools.map((t) => ({
          name: t.name,
          description: t.description,
          parameters: t.parameters,
        })),
      }]
    }

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${this.apiKey}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
    )
    if (!res.ok) throw new Error(`Gemini API error: ${res.status}`)
    const data = await res.json()
    const part = data.candidates?.[0]?.content?.parts?.[0]

    if (part?.functionCall) {
      return {
        toolCalls: [{ id: part.functionCall.name, name: part.functionCall.name, arguments: part.functionCall.args }],
      }
    }
    return { content: part?.text ?? '' }
  }
}
