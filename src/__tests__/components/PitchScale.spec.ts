import { describe, test, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import PitchScale from '@/components/PitchScale.vue'
import type { PitchResult } from '@/types'

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------
const excellent: PitchResult = {
  target: { name: 'C4', frequency: 261.63 },
  detected: { name: 'C4', frequency: 261.63 },
  centsDeviation: 5,
  medianFrequency: 261.63,
  accuracy: 'excellent',
}

const acceptable: PitchResult = {
  target: { name: 'D4', frequency: 293.66 },
  detected: { name: 'D4', frequency: 294.0 },
  centsDeviation: 20,
  medianFrequency: 294.0,
  accuracy: 'acceptable',
}

const off: PitchResult = {
  target: { name: 'E4', frequency: 329.63 },
  detected: { name: 'F4', frequency: 349.23 },
  centsDeviation: 95,
  medianFrequency: 349.23,
  accuracy: 'off',
}

const missed: PitchResult = {
  target: { name: 'G4', frequency: 392 },
  detected: null,
  centsDeviation: 0,
  medianFrequency: null,
  accuracy: 'missed',
}

const sharpPositive: PitchResult = {
  target: { name: 'A4', frequency: 440 },
  detected: { name: 'A4', frequency: 440 },
  centsDeviation: 12,
  medianFrequency: 440,
  accuracy: 'acceptable',
}

const flatNegative: PitchResult = {
  target: { name: 'A4', frequency: 440 },
  detected: { name: 'A4', frequency: 440 },
  centsDeviation: -8,
  medianFrequency: 440,
  accuracy: 'excellent',
}

const beyondPositive: PitchResult = {
  target: { name: 'A4', frequency: 440 },
  detected: { name: 'B4', frequency: 493.88 },
  centsDeviation: 75,
  medianFrequency: 493.88,
  accuracy: 'off',
}

const beyondNegative: PitchResult = {
  target: { name: 'A4', frequency: 440 },
  detected: { name: 'G4', frequency: 392 },
  centsDeviation: -200,
  medianFrequency: 392,
  accuracy: 'off',
}

// ---------------------------------------------------------------------------
describe('PitchScale', () => {
  describe('note name display', () => {
    test('renders the target note name', () => {
      const wrapper = mount(PitchScale, { props: { result: excellent } })
      expect(wrapper.text()).toContain('C4')
    })

    test('renders the detected note name when detected is not null', () => {
      const wrapper = mount(PitchScale, { props: { result: excellent } })
      // Both target and detected are C4; the detected name appears
      expect(wrapper.text()).toContain('C4')
    })

    test('shows "not detected" when accuracy is missed', () => {
      const wrapper = mount(PitchScale, { props: { result: missed } })
      expect(wrapper.text().toLowerCase()).toContain('not detected')
    })

    test('does not show "not detected" when note is detected', () => {
      const wrapper = mount(PitchScale, { props: { result: excellent } })
      expect(wrapper.text().toLowerCase()).not.toContain('not detected')
    })
  })

  describe('cents deviation text', () => {
    test('shows positive cents as "+N¢"', () => {
      const wrapper = mount(PitchScale, { props: { result: sharpPositive } })
      expect(wrapper.text()).toContain('+12¢')
    })

    test('shows negative cents as "-N¢"', () => {
      const wrapper = mount(PitchScale, { props: { result: flatNegative } })
      expect(wrapper.text()).toContain('-8¢')
    })

    test('shows "0¢" for zero deviation', () => {
      const zeroResult: PitchResult = { ...excellent, centsDeviation: 0 }
      const wrapper = mount(PitchScale, { props: { result: zeroResult } })
      expect(wrapper.text()).toContain('0¢')
    })

    test('does not show cents deviation text for missed notes', () => {
      const wrapper = mount(PitchScale, { props: { result: missed } })
      expect(wrapper.text()).not.toContain('¢')
    })
  })

  describe('accuracy classes', () => {
    test('applies success class for excellent accuracy', () => {
      const wrapper = mount(PitchScale, { props: { result: excellent } })
      expect(wrapper.find('.is-success').exists()).toBe(true)
    })

    test('applies warning class for acceptable accuracy', () => {
      const wrapper = mount(PitchScale, { props: { result: acceptable } })
      expect(wrapper.find('.is-warning').exists()).toBe(true)
    })

    test('applies danger class for off accuracy', () => {
      const wrapper = mount(PitchScale, { props: { result: off } })
      expect(wrapper.find('.is-danger').exists()).toBe(true)
    })

    test('applies danger class for missed accuracy', () => {
      const wrapper = mount(PitchScale, { props: { result: missed } })
      expect(wrapper.find('.is-danger').exists()).toBe(true)
    })
  })

  describe('scale labels', () => {
    test('renders the flat (♭) label', () => {
      const wrapper = mount(PitchScale, { props: { result: excellent } })
      expect(wrapper.text()).toContain('♭')
    })

    test('renders the sharp (♯) label', () => {
      const wrapper = mount(PitchScale, { props: { result: excellent } })
      expect(wrapper.text()).toContain('♯')
    })
  })

  describe('indicator position', () => {
    test('positions indicator at 55% for +5¢ deviation', () => {
      // 50 + (5 / 50) * 50 = 55
      const wrapper = mount(PitchScale, { props: { result: excellent } })
      const indicator = wrapper.find('[data-testid="pitch-indicator"]')
      expect(indicator.attributes('style')).toContain('55%')
    })

    test('positions indicator at 50% for 0¢ deviation', () => {
      const zeroResult: PitchResult = { ...excellent, centsDeviation: 0 }
      const wrapper = mount(PitchScale, { props: { result: zeroResult } })
      const indicator = wrapper.find('[data-testid="pitch-indicator"]')
      expect(indicator.attributes('style')).toContain('50%')
    })

    test('positions indicator at 74% for +24¢ deviation', () => {
      // 50 + (24 / 50) * 50 = 74
      const result: PitchResult = { ...acceptable, centsDeviation: 24 }
      const wrapper = mount(PitchScale, { props: { result: result } })
      const indicator = wrapper.find('[data-testid="pitch-indicator"]')
      expect(indicator.attributes('style')).toContain('74%')
    })

    test('clamps indicator at 100% for deviations beyond +50¢', () => {
      const wrapper = mount(PitchScale, { props: { result: beyondPositive } })
      const indicator = wrapper.find('[data-testid="pitch-indicator"]')
      expect(indicator.attributes('style')).toContain('100%')
    })

    test('clamps indicator at 0% for deviations beyond -50¢', () => {
      const wrapper = mount(PitchScale, { props: { result: beyondNegative } })
      const indicator = wrapper.find('[data-testid="pitch-indicator"]')
      expect(indicator.attributes('style')).toContain('0%')
    })
  })
})
