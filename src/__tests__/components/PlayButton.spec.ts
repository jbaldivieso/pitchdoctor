import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import PlayButton from '@/components/PlayButton.vue'

describe('PlayButton', () => {
  it('shows "Play" label when appState is idle', () => {
    const wrapper = mount(PlayButton, { props: { appState: 'idle' } })
    expect(wrapper.text()).toContain('Play')
  })

  it('shows "Playing…" label when appState is playing', () => {
    const wrapper = mount(PlayButton, { props: { appState: 'playing' } })
    expect(wrapper.text()).toContain('Playing')
  })

  it('shows "Listening…" label when appState is listening', () => {
    const wrapper = mount(PlayButton, { props: { appState: 'listening' } })
    expect(wrapper.text()).toContain('Listening')
  })

  it('shows "Try Again" and "New Sequence" buttons when appState is results', () => {
    const wrapper = mount(PlayButton, { props: { appState: 'results' } })
    expect(wrapper.text()).toContain('Try Again')
    expect(wrapper.text()).toContain('New Sequence')
  })

  it('emits play event when clicked in idle state', async () => {
    const wrapper = mount(PlayButton, { props: { appState: 'idle' } })
    await wrapper.find('button').trigger('click')
    expect(wrapper.emitted('play')).toBeTruthy()
  })

  it('emits tryAgain event when Try Again is clicked in results state', async () => {
    const wrapper = mount(PlayButton, { props: { appState: 'results' } })
    const buttons = wrapper.findAll('button')
    const tryAgainBtn = buttons.find((b) => b.text() === 'Try Again')
    await tryAgainBtn?.trigger('click')
    expect(wrapper.emitted('tryAgain')).toBeTruthy()
  })

  it('emits newSequence event when New Sequence is clicked in results state', async () => {
    const wrapper = mount(PlayButton, { props: { appState: 'results' } })
    const buttons = wrapper.findAll('button')
    const newSeqBtn = buttons.find((b) => b.text() === 'New Sequence')
    await newSeqBtn?.trigger('click')
    expect(wrapper.emitted('newSequence')).toBeTruthy()
  })

  it('button is disabled during playing state', () => {
    const wrapper = mount(PlayButton, { props: { appState: 'playing' } })
    const button = wrapper.find('button')
    expect(button.attributes('disabled')).toBeDefined()
  })

  it('button is disabled during listening state', () => {
    const wrapper = mount(PlayButton, { props: { appState: 'listening' } })
    const button = wrapper.find('button')
    expect(button.attributes('disabled')).toBeDefined()
  })

  it('uses is-large class for large tap targets', () => {
    const wrapper = mount(PlayButton, { props: { appState: 'idle' } })
    expect(wrapper.find('button').classes()).toContain('is-large')
  })
})
