import type { LlmClient, LlmMessage, LlmTool, LlmResponse } from './index'

export class GeminiClient implements LlmClient {
  private apiKey: string
  private model: string
  constructor(apiKey: string, model: string) { this.apiKey = apiKey; this.model = model }

  async complete(
    messages: LlmMessage[],
    tools?: LlmTool[],
    onToolCall?: (name: string, args: Record<string, unknown>) => Promise<string>
  ): Promise<LlmResponse> {
    const system = messages.find((m) => m.role === 'system')?.content
    let contents: Array<Record<string, unknown>> = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }))

    const bodyBase: Record<string, unknown> = {}
    if (system) bodyBase.systemInstruction = { parts: [{ text: system }] }
    if (tools?.length) {
      bodyBase.tools = [{
        functionDeclarations: tools.map((t) => ({
          name: t.name,
          description: t.description,
          parameters: t.parameters,
        })),
      }]
    }

    for (let i = 0; i < 5; i++) {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...bodyBase, contents }) }
      )
      if (!res.ok) throw new Error(`Gemini API error: ${res.status}`)
      const data = await res.json()
      const part = data.candidates?.[0]?.content?.parts?.[0]

      if (part?.functionCall && onToolCall) {
        const result = await onToolCall(part.functionCall.name, part.functionCall.args)
        contents = [
          ...contents,
          { role: 'model', parts: [{ functionCall: part.functionCall }] },
          // Gemini v1beta expects functionResponse as a user turn
          { role: 'user', parts: [{ functionResponse: { name: part.functionCall.name, response: JSON.parse(result) } }] },
        ]
        continue
      }
      if (part?.functionCall) {
        return {
          toolCalls: [{ id: part.functionCall.name, name: part.functionCall.name, arguments: part.functionCall.args }],
        }
      }
      return { content: part?.text ?? '' }
    }
    throw new Error('Gemini: exceeded tool call iteration limit')
  }
}
