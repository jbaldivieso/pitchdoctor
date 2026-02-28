import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { reactive } from 'vue'
import SettingsPanel from '../../components/SettingsPanel.vue'
import type { Settings } from '../../types'

const makeSettings = (): Settings => ({
  sequenceLength: 3,
  synthVoice: 'soft',
  rootNote: 'C',
  lowOctave: 3,
  highOctave: 5,
})

describe('SettingsPanel', () => {
  it('renders sequence length picker with values 1–7', () => {
    const settings = reactive(makeSettings())
    const wrapper = mount(SettingsPanel, { props: { settings } })
    const options = wrapper.find('[data-testid="sequence-length"]').findAll('option')
    expect(options).toHaveLength(7)
    expect(options[0].text()).toBe('1')
    expect(options[6].text()).toBe('7')
  })

  it('renders synth voice selector with Sine, Soft, Piano options', () => {
    const settings = reactive(makeSettings())
    const wrapper = mount(SettingsPanel, { props: { settings } })
    const select = wrapper.find('[data-testid="synth-voice"]')
    const texts = select.text()
    expect(texts).toContain('Sine')
    expect(texts).toContain('Soft')
    expect(texts).toContain('Piano')
  })

  it('shows current synth voice selection', () => {
    const settings = reactive({ ...makeSettings(), synthVoice: 'piano' as const })
    const wrapper = mount(SettingsPanel, { props: { settings } })
    const el = wrapper.find('[data-testid="synth-voice"]').element as HTMLSelectElement
    expect(el.value).toBe('piano')
  })

  it('renders root note selector with all 12 chromatic notes', () => {
    const settings = reactive(makeSettings())
    const wrapper = mount(SettingsPanel, { props: { settings } })
    const options = wrapper.find('[data-testid="root-note"]').findAll('option')
    expect(options).toHaveLength(12)
  })

  it('renders octave range controls for low and high octave', () => {
    const settings = reactive(makeSettings())
    const wrapper = mount(SettingsPanel, { props: { settings } })
    expect(wrapper.find('[data-testid="low-octave"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="high-octave"]').exists()).toBe(true)
  })

  it('shows current value for each setting', () => {
    const settings = reactive({
      sequenceLength: 5,
      synthVoice: 'sine' as const,
      rootNote: 'G',
      lowOctave: 2,
      highOctave: 6,
    })
    const wrapper = mount(SettingsPanel, { props: { settings } })
    const seqLen = wrapper.find('[data-testid="sequence-length"]').element as HTMLSelectElement
    const voice = wrapper.find('[data-testid="synth-voice"]').element as HTMLSelectElement
    const root = wrapper.find('[data-testid="root-note"]').element as HTMLSelectElement
    const lowOct = wrapper.find('[data-testid="low-octave"]').element as HTMLSelectElement
    const highOct = wrapper.find('[data-testid="high-octave"]').element as HTMLSelectElement
    expect(seqLen.value).toBe('5')
    expect(voice.value).toBe('sine')
    expect(root.value).toBe('G')
    expect(lowOct.value).toBe('2')
    expect(highOct.value).toBe('6')
  })

  it('emits change when sequence length is modified', async () => {
    const settings = reactive(makeSettings())
    const wrapper = mount(SettingsPanel, { props: { settings } })
    await wrapper.find('[data-testid="sequence-length"]').setValue('5')
    expect(wrapper.emitted('change')).toBeTruthy()
  })

  it('emits change when synth voice is modified', async () => {
    const settings = reactive(makeSettings())
    const wrapper = mount(SettingsPanel, { props: { settings } })
    await wrapper.find('[data-testid="synth-voice"]').setValue('piano')
    expect(wrapper.emitted('change')).toBeTruthy()
  })

  it('emits change when root note is modified', async () => {
    const settings = reactive(makeSettings())
    const wrapper = mount(SettingsPanel, { props: { settings } })
    await wrapper.find('[data-testid="root-note"]').setValue('G')
    expect(wrapper.emitted('change')).toBeTruthy()
  })

  it('emits change when low octave is modified', async () => {
    const settings = reactive(makeSettings())
    const wrapper = mount(SettingsPanel, { props: { settings } })
    await wrapper.find('[data-testid="low-octave"]').setValue('2')
    expect(wrapper.emitted('change')).toBeTruthy()
  })

  it('emits change when high octave is modified', async () => {
    const settings = reactive(makeSettings())
    const wrapper = mount(SettingsPanel, { props: { settings } })
    await wrapper.find('[data-testid="high-octave"]').setValue('6')
    expect(wrapper.emitted('change')).toBeTruthy()
  })
})
