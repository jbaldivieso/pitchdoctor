import { describe, test, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ResultsPanel from '@/components/ResultsPanel.vue'
import PitchScale from '@/components/PitchScale.vue'
import type { PitchResult } from '@/types'

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------
const excellentResult: PitchResult = {
  target: { name: 'C4', frequency: 261.63 },
  detected: { name: 'C4', frequency: 261.63 },
  centsDeviation: 5,
  medianFrequency: 261.63,
  accuracy: 'excellent',
}

const missedResult: PitchResult = {
  target: { name: 'D4', frequency: 293.66 },
  detected: null,
  centsDeviation: 0,
  medianFrequency: null,
  accuracy: 'missed',
}

const offResult: PitchResult = {
  target: { name: 'E4', frequency: 329.63 },
  detected: { name: 'F4', frequency: 349.23 },
  centsDeviation: 95,
  medianFrequency: 349.23,
  accuracy: 'off',
}

// ---------------------------------------------------------------------------
describe('ResultsPanel', () => {
  describe('rendering', () => {
    test('renders one PitchScale per result', () => {
      const results = [excellentResult, missedResult, offResult]
      const wrapper = mount(ResultsPanel, { props: { results } })
      expect(wrapper.findAllComponents(PitchScale)).toHaveLength(3)
    })

    test('renders zero PitchScales when results array is empty', () => {
      const wrapper = mount(ResultsPanel, { props: { results: [] } })
      expect(wrapper.findAllComponents(PitchScale)).toHaveLength(0)
    })

    test('renders a single PitchScale for one result', () => {
      const wrapper = mount(ResultsPanel, { props: { results: [excellentResult] } })
      expect(wrapper.findAllComponents(PitchScale)).toHaveLength(1)
    })
  })

  describe('mixed results', () => {
    test('handles mixed excellent and missed results correctly', () => {
      const results = [excellentResult, missedResult]
      const wrapper = mount(ResultsPanel, { props: { results } })
      const scales = wrapper.findAllComponents(PitchScale)
      expect(scales).toHaveLength(2)
      // First scale shows the excellent note name
      expect(scales[0].text()).toContain('C4')
      // Second scale shows "not detected"
      expect(scales[1].text().toLowerCase()).toContain('not detected')
    })
  })

  describe('props passed to PitchScale', () => {
    test('passes the correct PitchResult to each PitchScale', () => {
      const results = [excellentResult, missedResult]
      const wrapper = mount(ResultsPanel, { props: { results } })
      const scales = wrapper.findAllComponents(PitchScale)
      expect(scales[0].props('result')).toEqual(excellentResult)
      expect(scales[1].props('result')).toEqual(missedResult)
    })
  })

  describe('empty state', () => {
    test('renders the component without error when results is empty', () => {
      expect(() => mount(ResultsPanel, { props: { results: [] } })).not.toThrow()
    })
  })
})
