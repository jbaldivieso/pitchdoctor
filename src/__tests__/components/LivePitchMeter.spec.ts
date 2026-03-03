import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import LivePitchMeter from '@/components/LivePitchMeter.vue'
import type { Note, LivePitch } from '@/types'

const C4: Note = { name: 'C4', frequency: 261.63 }

function makeLivePitch(
  centsDeviation: number | null,
  noteName: string | null = null,
  clarity = 0.95,
): LivePitch {
  return {
    frequency: centsDeviation !== null ? 261.63 : null,
    centsDeviation,
    clarity,
    noteName,
  }
}

describe('LivePitchMeter', () => {
  it('shows "Sing a note…" hint when livePitch is null', () => {
    const wrapper = mount(LivePitchMeter, { props: { targetNote: C4, livePitch: null } })
    expect(wrapper.text()).toContain('Sing a note')
  })

  it('shows "Sing a note…" hint when clarity is below threshold', () => {
    const lp = makeLivePitch(null, null, 0.3)
    const wrapper = mount(LivePitchMeter, { props: { targetNote: C4, livePitch: lp } })
    expect(wrapper.text()).toContain('Sing a note')
  })

  it('shows target note name', () => {
    const wrapper = mount(LivePitchMeter, { props: { targetNote: C4, livePitch: null } })
    expect(wrapper.text()).toContain('C4')
  })

  it('shows detected note name when singing', () => {
    const lp = makeLivePitch(-8, 'B3')
    const wrapper = mount(LivePitchMeter, { props: { targetNote: C4, livePitch: lp } })
    expect(wrapper.text()).toContain('B3')
  })

  it('shows cents offset text when singing', () => {
    const lp = makeLivePitch(-8, 'B3')
    const wrapper = mount(LivePitchMeter, { props: { targetNote: C4, livePitch: lp } })
    expect(wrapper.text()).toContain('-8¢')
  })

  it('shows +N¢ for positive cents deviation', () => {
    const lp = makeLivePitch(12, 'C#4')
    const wrapper = mount(LivePitchMeter, { props: { targetNote: C4, livePitch: lp } })
    expect(wrapper.text()).toContain('+12¢')
  })

  it('shows 0¢ for exactly on pitch', () => {
    const lp = makeLivePitch(0, 'C4')
    const wrapper = mount(LivePitchMeter, { props: { targetNote: C4, livePitch: lp } })
    expect(wrapper.text()).toContain('0¢')
  })

  it('applies is-success class when within ±10¢', () => {
    const lp = makeLivePitch(5, 'C4')
    const wrapper = mount(LivePitchMeter, { props: { targetNote: C4, livePitch: lp } })
    expect(wrapper.html()).toContain('is-success')
  })

  it('applies is-warning class when 10–25¢ off', () => {
    const lp = makeLivePitch(18, 'C4')
    const wrapper = mount(LivePitchMeter, { props: { targetNote: C4, livePitch: lp } })
    expect(wrapper.html()).toContain('is-warning')
  })

  it('applies is-danger class when more than 25¢ off', () => {
    const lp = makeLivePitch(-100, 'B3')
    const wrapper = mount(LivePitchMeter, { props: { targetNote: C4, livePitch: lp } })
    expect(wrapper.html()).toContain('is-danger')
  })

  it('renders 7 tick marks (±3 semitones)', () => {
    const wrapper = mount(LivePitchMeter, { props: { targetNote: C4, livePitch: null } })
    expect(wrapper.findAll('.tick-line')).toHaveLength(7)
  })

  it('renders 7 tick labels with note names around target', () => {
    const wrapper = mount(LivePitchMeter, { props: { targetNote: C4, livePitch: null } })
    const labels = wrapper.findAll('.tick-label')
    expect(labels).toHaveLength(7)
    const text = wrapper.text()
    // Center should be C4
    expect(text).toContain('C4')
    // Adjacent semitones
    expect(text).toContain('B3')  // -1 semitone
    expect(text).toContain('D4')  // +2 semitones
  })

  it('indicator is at 50% left when on-pitch', () => {
    const lp = makeLivePitch(0, 'C4')
    const wrapper = mount(LivePitchMeter, { props: { targetNote: C4, livePitch: lp } })
    const indicator = wrapper.find('.pitch-indicator:not(.pitch-indicator--silent)')
    expect(indicator.attributes('style')).toContain('left: 50%')
  })

  it('indicator moves left when flat', () => {
    // -100¢ with default rangeInCents=300: left = 50 + (-100/300)*50 = 33.33%
    const lp = makeLivePitch(-100, 'B3')
    const wrapper = mount(LivePitchMeter, { props: { targetNote: C4, livePitch: lp } })
    const indicator = wrapper.find('.pitch-indicator:not(.pitch-indicator--silent)')
    const style = indicator.attributes('style') ?? ''
    const match = style.match(/left:\s*([\d.]+)%/)
    expect(match).not.toBeNull()
    const leftVal = parseFloat(match![1])
    expect(leftVal).toBeLessThan(50)
  })

  it('indicator moves right when sharp', () => {
    // +100¢ with rangeInCents=300: left = 50 + (100/300)*50 = 66.67%
    const lp = makeLivePitch(100, 'Db4')
    const wrapper = mount(LivePitchMeter, { props: { targetNote: C4, livePitch: lp } })
    const indicator = wrapper.find('.pitch-indicator:not(.pitch-indicator--silent)')
    const style = indicator.attributes('style') ?? ''
    const match = style.match(/left:\s*([\d.]+)%/)
    expect(match).not.toBeNull()
    const leftVal = parseFloat(match![1])
    expect(leftVal).toBeGreaterThan(50)
  })

  it('clamps indicator to 2% when extremely flat', () => {
    const lp = makeLivePitch(-9999, 'C1')
    const wrapper = mount(LivePitchMeter, { props: { targetNote: C4, livePitch: lp } })
    const indicator = wrapper.find('.pitch-indicator:not(.pitch-indicator--silent)')
    expect(indicator.attributes('style')).toContain('left: 2%')
  })

  it('clamps indicator to 98% when extremely sharp', () => {
    const lp = makeLivePitch(9999, 'C7')
    const wrapper = mount(LivePitchMeter, { props: { targetNote: C4, livePitch: lp } })
    const indicator = wrapper.find('.pitch-indicator:not(.pitch-indicator--silent)')
    expect(indicator.attributes('style')).toContain('left: 98%')
  })

  it('shows silent indicator when not singing', () => {
    const wrapper = mount(LivePitchMeter, { props: { targetNote: C4, livePitch: null } })
    expect(wrapper.find('.pitch-indicator--silent').exists()).toBe(true)
  })

  it('uses custom rangeInCents when provided', () => {
    // +200¢ with rangeInCents=400: left = 50 + (200/400)*50 = 75%
    const lp = makeLivePitch(200, 'D4')
    const wrapper = mount(LivePitchMeter, {
      props: { targetNote: C4, livePitch: lp, rangeInCents: 400 },
    })
    const indicator = wrapper.find('.pitch-indicator:not(.pitch-indicator--silent)')
    const style = indicator.attributes('style') ?? ''
    const match = style.match(/left:\s*([\d.]+)%/)
    expect(match).not.toBeNull()
    expect(parseFloat(match![1])).toBeCloseTo(75, 0)
  })
})
