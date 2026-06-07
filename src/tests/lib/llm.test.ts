import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createLlmClient } from '../../lib/llm/index'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

beforeEach(() => { mockFetch.mockReset() })

describe('Anthropic provider', () => {
  const client = createLlmClient('anthropic', 'sk-ant-test')

  it('returns text content', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        content: [{ type: 'text', text: 'Hello from Claude' }],
      }),
    })
    const res = await client.complete([{ role: 'user', content: 'hi' }])
    expect(res.content).toBe('Hello from Claude')
  })

  it('returns tool calls when LLM uses a tool', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        content: [{ type: 'tool_use', id: 'tu_1', name: 'searchPlaces', input: { query: 'ramen' } }],
      }),
    })
    const res = await client.complete([{ role: 'user', content: 'find ramen' }])
    expect(res.toolCalls).toHaveLength(1)
    expect(res.toolCalls![0].name).toBe('searchPlaces')
    expect(res.toolCalls![0].arguments).toEqual({ query: 'ramen' })
  })

  it('throws on non-OK HTTP response', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 401 })
    await expect(client.complete([{ role: 'user', content: 'hi' }])).rejects.toThrow('401')
  })
})

describe('OpenAI provider', () => {
  const client = createLlmClient('openai', 'sk-test')

  it('returns text content', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: 'Hello from GPT' } }] }),
    })
    const res = await client.complete([{ role: 'user', content: 'hi' }])
    expect(res.content).toBe('Hello from GPT')
  })
})

describe('Gemini provider', () => {
  const client = createLlmClient('gemini', 'AIza-test')

  it('returns text content', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: 'Hello from Gemini' }] } }],
      }),
    })
    const res = await client.complete([{ role: 'user', content: 'hi' }])
    expect(res.content).toBe('Hello from Gemini')
  })
})

describe('Ollama provider', () => {
  const client = createLlmClient('ollama', '')

  it('returns text content', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ message: { content: 'Hello from Llama' } }),
    })
    const res = await client.complete([{ role: 'user', content: 'hi' }])
    expect(res.content).toBe('Hello from Llama')
  })
})
