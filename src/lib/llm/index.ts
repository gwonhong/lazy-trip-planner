import type { LlmProvider } from '../../types'
import { AnthropicClient } from './anthropic'
import { OpenAiClient } from './openai'
import { GeminiClient } from './gemini'
import { OllamaClient } from './ollama'

export interface LlmMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string
  toolCallId?: string
}

export interface LlmTool {
  name: string
  description: string
  parameters: Record<string, unknown>
}

export interface LlmToolCall {
  id: string
  name: string
  arguments: Record<string, unknown>
}

export interface LlmResponse {
  content?: string
  toolCalls?: LlmToolCall[]
}

export interface LlmClient {
  complete(
    messages: LlmMessage[],
    tools?: LlmTool[],
    onToolCall?: (name: string, args: Record<string, unknown>) => Promise<string>
  ): Promise<LlmResponse>
}

export function createLlmClient(provider: LlmProvider, apiKey: string, model: string): LlmClient {
  switch (provider) {
    case 'anthropic': return new AnthropicClient(apiKey, model)
    case 'openai': return new OpenAiClient(apiKey, model)
    case 'gemini': return new GeminiClient(apiKey, model)
    case 'ollama': return new OllamaClient(model)
  }
}
