import { useCallback } from 'react'

export function usePanelResize(
  currentWidth: number,
  setWidth: (w: number) => void,
  min: number,
  max: number
): (e: React.PointerEvent) => void {
  return useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault()
      const startX = e.clientX
      const startWidth = currentWidth

      const onMove = (ev: PointerEvent) => {
        const next = Math.min(max, Math.max(min, startWidth + (ev.clientX - startX)))
        setWidth(next)
      }

      const onUp = () => {
        window.removeEventListener('pointermove', onMove)
        window.removeEventListener('pointerup', onUp)
        window.removeEventListener('pointercancel', onUp)
      }

      window.addEventListener('pointermove', onMove)
      window.addEventListener('pointerup', onUp)
      window.addEventListener('pointercancel', onUp)
    },
    [currentWidth, setWidth, min, max]
  )
}
