import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import CommandBar from '../../components/trip/CommandBar'

vi.mock('../../lib/maps/placesSearch', () => ({
  autocompletePlaces: vi.fn().mockResolvedValue([]),
  getPlaceDetails: vi.fn(),
}))
vi.mock('../../stores/tripStore', () => ({
  useTripStore: vi.fn(() => ({
    trips: [{ id: 't1', slots: [], snapshots: [] }],
    activeSlotId: null,
    llmScope: 'slot',
    updateSlot: vi.fn(),
    toggleLlmScope: vi.fn(),
  })),
}))
vi.mock('../../stores/settingsStore', () => ({
  useSettingsStore: vi.fn(() => ({ googleMapsApiKey: 'fake' })),
}))

describe('CommandBar', () => {
  it('renders search input and mode toggle', () => {
    render(
      <MemoryRouter>
        <CommandBar tripId="t1" onCandidatesChange={vi.fn()} />
      </MemoryRouter>
    )
    expect(screen.getByPlaceholderText(/search places/i)).toBeInTheDocument()
    expect(screen.getByText(/🔍 Search/i)).toBeInTheDocument()
    expect(screen.getByText(/✨ Plan/i)).toBeInTheDocument()
  })
})
