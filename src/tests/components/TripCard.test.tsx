import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import TripCard from '../../components/home/TripCard'
import type { Trip } from '../../types'

const trip: Trip = {
  id: '1', title: 'Seoul Trip', destination: 'Seoul, Korea',
  startDate: '2025-06-10', endDate: '2025-06-14',
  createdAt: '2025-01-01T00:00:00Z', slots: [], snapshots: [],
}

describe('TripCard', () => {
  it('renders trip title and destination', () => {
    render(<TripCard trip={trip} onOpen={vi.fn()} onDelete={vi.fn()} />)
    expect(screen.getByText('Seoul Trip')).toBeInTheDocument()
    expect(screen.getByText('Seoul, Korea')).toBeInTheDocument()
  })

  it('calls onOpen when card is clicked', () => {
    const onOpen = vi.fn()
    render(<TripCard trip={trip} onOpen={onOpen} onDelete={vi.fn()} />)
    fireEvent.click(screen.getByText('Seoul Trip'))
    expect(onOpen).toHaveBeenCalled()
  })

  it('calls onDelete when delete button is clicked', () => {
    const onDelete = vi.fn()
    render(<TripCard trip={trip} onOpen={vi.fn()} onDelete={onDelete} />)
    fireEvent.click(screen.getByRole('button', { name: /delete/i }))
    expect(onDelete).toHaveBeenCalled()
  })
})
