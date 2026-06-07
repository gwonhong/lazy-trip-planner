import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ResizeDivider from '../../components/shared/ResizeDivider'

describe('ResizeDivider', () => {
  it('renders without crashing', () => {
    render(<ResizeDivider onPointerDown={() => {}} />)
  })

  it('calls onPointerDown when pointer is pressed', () => {
    const handler = vi.fn()
    render(<ResizeDivider onPointerDown={handler} />)
    fireEvent.pointerDown(screen.getByRole('separator'))
    expect(handler).toHaveBeenCalledOnce()
  })
})
