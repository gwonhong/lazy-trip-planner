import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import SnapshotCard from '../../components/trip/SnapshotCard'
import type { Snapshot } from '../../types'

const snapshot: Snapshot = {
  id: '1', createdAt: '2025-06-10T09:32:00Z',
  label: 'optimize stops', summary: 'Reordered stops for efficiency',
  isManual: false, slotsSnapshot: [],
}

describe('SnapshotCard', () => {
  it('renders label and summary', () => {
    render(<SnapshotCard snapshot={snapshot} isLatest={false} onRevert={vi.fn()} />)
    expect(screen.getByText('optimize stops')).toBeInTheDocument()
    expect(screen.getByText('Reordered stops for efficiency')).toBeInTheDocument()
  })

  it('shows latest badge when isLatest is true', () => {
    render(<SnapshotCard snapshot={snapshot} isLatest={true} onRevert={vi.fn()} />)
    expect(screen.getByText('latest')).toBeInTheDocument()
  })

  it('calls onRevert when revert button is clicked', () => {
    const onRevert = vi.fn()
    render(<SnapshotCard snapshot={snapshot} isLatest={false} onRevert={onRevert} />)
    fireEvent.click(screen.getByRole('button', { name: /revert/i }))
    expect(onRevert).toHaveBeenCalled()
  })
})
