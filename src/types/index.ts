export type LlmProvider = 'anthropic' | 'openai' | 'gemini' | 'ollama'

export type Settings = {
  llmProvider: LlmProvider
  apiKeys: { anthropic: string; openai: string; gemini: string; ollama: string }
  models: { anthropic: string; openai: string; gemini: string; ollama: string }
  googleMapsApiKey: string
}

export type Place = {
  id: string
  name: string
  googlePlaceId?: string
  lat?: number
  lng?: number
  estimatedDuration?: number // minutes
}

export type Slot = {
  id: string
  date: string // YYYY-MM-DD
  title: string
  order: number
  startTime?: string // "09:00"
  endTime?: string   // "13:00"
  places: Place[]
  maybes: Place[]
}

export type Snapshot = {
  id: string
  createdAt: string
  label: string
  summary: string
  commentary?: string
  isManual: boolean
  slotsSnapshot: Slot[]
}

export type Trip = {
  id: string
  title: string
  destination: string
  startDate: string // YYYY-MM-DD
  endDate: string   // YYYY-MM-DD
  createdAt: string
  slots: Slot[]
  snapshots: Snapshot[]
}
