import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import NoteDisplay from '@/components/NoteDisplay.vue'

const notes = [
  { name: 'C4', frequency: 261.63 },
  { name: 'D4', frequency: 293.66 },
  { name: 'E4', frequency: 329.63 },
]

describe('NoteDisplay', () => {
  it('renders all notes in the sequence as tags', () => {
    const wrapper = mount(NoteDisplay, { props: { notes, activeIndex: null } })
    expect(wrapper.text()).toContain('C4')
    expect(wrapper.text()).toContain('D4')
    expect(wrapper.text()).toContain('E4')
    expect(wrapper.findAll('.tag')).toHaveLength(3)
  })

  it('highlights the currently active note with is-primary class', () => {
    const wrapper = mount(NoteDisplay, { props: { notes, activeIndex: 1 } })
    const tags = wrapper.findAll('.tag')
    expect(tags[0].classes()).not.toContain('is-primary')
    expect(tags[1].classes()).toContain('is-primary')
    expect(tags[2].classes()).not.toContain('is-primary')
  })

  it('highlights the first note when activeIndex is 0', () => {
    const wrapper = mount(NoteDisplay, { props: { notes, activeIndex: 0 } })
    const tags = wrapper.findAll('.tag')
    expect(tags[0].classes()).toContain('is-primary')
    expect(tags[1].classes()).not.toContain('is-primary')
  })

  it('no note is highlighted when activeIndex is null', () => {
    const wrapper = mount(NoteDisplay, { props: { notes, activeIndex: null } })
    const tags = wrapper.findAll('.tag')
    tags.forEach((tag) => {
      expect(tag.classes()).not.toContain('is-primary')
    })
  })

  it('renders zero notes gracefully', () => {
    const wrapper = mount(NoteDisplay, { props: { notes: [], activeIndex: null } })
    expect(wrapper.findAll('.tag')).toHaveLength(0)
  })
})
