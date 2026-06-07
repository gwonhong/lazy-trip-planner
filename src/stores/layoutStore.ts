import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type LayoutState = {
  leftPanelWidth: number
  rightPanelWidth: number
  setLeftPanelWidth: (w: number) => void
  setRightPanelWidth: (w: number) => void
}

export const useLayoutStore = create<LayoutState>()(
  persist(
    (set) => ({
      leftPanelWidth: 288,
      rightPanelWidth: 224,
      setLeftPanelWidth: (w) => set({ leftPanelWidth: w }),
      setRightPanelWidth: (w) => set({ rightPanelWidth: w }),
    }),
    { name: 'lazy-trip-planner-layout' }
  )
)
