import { describe, it, expect, beforeEach } from 'vitest'
import { useLayoutStore } from '../../stores/layoutStore'

beforeEach(() => {
  useLayoutStore.setState({ leftPanelWidth: 288, rightPanelWidth: 224 })
})

describe('useLayoutStore', () => {
  it('has default leftPanelWidth of 288', () => {
    expect(useLayoutStore.getState().leftPanelWidth).toBe(288)
  })

  it('has default rightPanelWidth of 224', () => {
    expect(useLayoutStore.getState().rightPanelWidth).toBe(224)
  })

  it('setLeftPanelWidth updates leftPanelWidth', () => {
    useLayoutStore.getState().setLeftPanelWidth(350)
    expect(useLayoutStore.getState().leftPanelWidth).toBe(350)
  })

  it('setRightPanelWidth updates rightPanelWidth', () => {
    useLayoutStore.getState().setRightPanelWidth(300)
    expect(useLayoutStore.getState().rightPanelWidth).toBe(300)
  })
})
