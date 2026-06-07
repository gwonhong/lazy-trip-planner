import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { usePanelResize } from '../../lib/usePanelResize'

function Handle({ width, setWidth, min, max }: {
  width: number
  setWidth: (w: number) => void
  min: number
  max: number
}) {
  const onPointerDown = usePanelResize(width, setWidth, min, max)
  return <div data-testid="handle" onPointerDown={onPointerDown} />
}

describe('usePanelResize', () => {
  let setWidth: (w: number) => void

  beforeEach(() => {
    setWidth = vi.fn() as unknown as (w: number) => void
  })

  it('calls setWidth with width + delta on pointermove', () => {
    render(<Handle width={288} setWidth={setWidth} min={200} max={480} />)
    const handle = screen.getByTestId('handle')

    fireEvent.pointerDown(handle, { clientX: 100 })
    fireEvent.pointerMove(window, { clientX: 150 })

    expect(setWidth).toHaveBeenCalledWith(338) // 288 + 50
  })

  it('clamps width to min', () => {
    render(<Handle width={288} setWidth={setWidth} min={200} max={480} />)
    const handle = screen.getByTestId('handle')

    fireEvent.pointerDown(handle, { clientX: 100 })
    fireEvent.pointerMove(window, { clientX: 0 }) // delta = -100, 288-100=188 < 200

    expect(setWidth).toHaveBeenCalledWith(200)
  })

  it('clamps width to max', () => {
    render(<Handle width={288} setWidth={setWidth} min={200} max={480} />)
    const handle = screen.getByTestId('handle')

    fireEvent.pointerDown(handle, { clientX: 100 })
    fireEvent.pointerMove(window, { clientX: 400 }) // delta = 300, 288+300=588 > 480

    expect(setWidth).toHaveBeenCalledWith(480)
  })

  it('stops calling setWidth after pointerup', () => {
    render(<Handle width={288} setWidth={setWidth} min={200} max={480} />)
    const handle = screen.getByTestId('handle')

    fireEvent.pointerDown(handle, { clientX: 100 })
    fireEvent.pointerUp(window)
    fireEvent.pointerMove(window, { clientX: 200 })

    expect(setWidth).not.toHaveBeenCalled()
  })
})
