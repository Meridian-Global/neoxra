import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { InstagramForm } from '../components/InstagramForm'

const noop = () => {}

describe('InstagramForm', () => {
  it('renders two textareas, one select, and one button', () => {
    render(<InstagramForm onSubmit={noop} disabled={false} />)
    expect(screen.getAllByRole('textbox')).toHaveLength(2)
    expect(screen.getByRole('combobox')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /generate/i })).toBeInTheDocument()
  })

  it('button is disabled when topic is empty', () => {
    render(<InstagramForm onSubmit={noop} disabled={false} />)
    expect(screen.getByRole('button', { name: /generate/i })).toBeDisabled()
  })

  it('button is disabled when template text is empty', async () => {
    const user = userEvent.setup()
    render(<InstagramForm onSubmit={noop} disabled={false} />)
    // Fill only topic
    await user.type(screen.getByLabelText(/topic/i), 'AI tools')
    expect(screen.getByRole('button', { name: /generate/i })).toBeDisabled()
  })

  it('button is disabled when disabled prop is true', async () => {
    const user = userEvent.setup()
    render(<InstagramForm onSubmit={noop} disabled={true} />)
    await user.type(screen.getByLabelText(/topic/i), 'AI tools')
    await user.type(screen.getByLabelText(/template/i), 'Some template')
    expect(screen.getByRole('button', { name: /generat/i })).toBeDisabled()
  })

  it('calls onSubmit with correct field names on click', async () => {
    const user = userEvent.setup()
    const onSubmit = jest.fn()
    render(<InstagramForm onSubmit={onSubmit} disabled={false} />)

    await user.type(screen.getByLabelText(/topic/i), 'AI tools')
    await user.type(screen.getByLabelText(/template/i), 'Some template')
    await user.click(screen.getByRole('button', { name: /generate/i }))

    expect(onSubmit).toHaveBeenCalledWith({
      topic: 'AI tools',
      template_text: 'Some template',
      goal: 'engagement',
    })
  })

  it('goal defaults to engagement', () => {
    render(<InstagramForm onSubmit={noop} disabled={false} />)
    expect(screen.getByRole('combobox')).toHaveValue('engagement')
  })

  it('submits selected goal value', async () => {
    const user = userEvent.setup()
    const onSubmit = jest.fn()
    render(<InstagramForm onSubmit={onSubmit} disabled={false} />)

    await user.type(screen.getByLabelText(/topic/i), 'AI tools')
    await user.type(screen.getByLabelText(/template/i), 'Some template')
    await user.selectOptions(screen.getByRole('combobox'), 'authority')
    await user.click(screen.getByRole('button', { name: /generate/i }))

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ goal: 'authority' }),
    )
  })

  it('submits on Cmd+Enter in topic textarea', async () => {
    const user = userEvent.setup()
    const onSubmit = jest.fn()
    render(<InstagramForm onSubmit={onSubmit} disabled={false} />)

    const topicInput = screen.getByLabelText(/topic/i)
    await user.type(topicInput, 'AI tools')
    await user.type(screen.getByLabelText(/template/i), 'Some template')
    // Focus back on topic, then Cmd+Enter
    topicInput.focus()
    await user.keyboard('{Meta>}{Enter}{/Meta}')

    expect(onSubmit).toHaveBeenCalledTimes(1)
  })

  it('submits on Ctrl+Enter in template textarea', async () => {
    const user = userEvent.setup()
    const onSubmit = jest.fn()
    render(<InstagramForm onSubmit={onSubmit} disabled={false} />)

    const templateInput = screen.getByLabelText(/template/i)
    await user.type(screen.getByLabelText(/topic/i), 'AI tools')
    await user.type(templateInput, 'Some template')
    // Focus on template, then Ctrl+Enter
    templateInput.focus()
    await user.keyboard('{Control>}{Enter}{/Control}')

    expect(onSubmit).toHaveBeenCalledTimes(1)
  })
})
