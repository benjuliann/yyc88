import { useState, type SubmitEvent } from 'react'
import Logo from '../components/Logo'
import { addBrick, MESSAGE_MAX, NAME_MAX } from './bricks'

export default function AddBrickForm() {
  const [name, setName] = useState('')
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState<'idle' | 'saving' | 'done' | 'error'>('idle')

  const submit = async (event: SubmitEvent) => {
    event.preventDefault()
    setStatus('saving')
    try {
      await addBrick(name.trim(), message.trim())
      setStatus('done')
    } catch (err) {
      console.error(err)
      setStatus('error')
    }
  }

  if (status === 'done') {
    return (
      <div className="add-brick__form">
        <Logo />
        <p className="add-brick__message">Your brick is on the wall. Look at the big screen!</p>
        <button
          type="button"
          className="join-race join-race--outline"
          onClick={() => {
            setName('')
            setMessage('')
            setStatus('idle')
          }}
        >
          Add another
        </button>
      </div>
    )
  }

  return (
    <form className="add-brick__form" onSubmit={submit}>
      <Logo />
      <h1 className="add-brick__title">Lay a brick</h1>
      <input
        className="add-brick__input"
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder="Your name"
        maxLength={NAME_MAX}
        autoComplete="off"
        aria-label="Your name"
      />
      <textarea
        className="add-brick__input"
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        placeholder="A memory of Calgary '88 (optional)"
        maxLength={MESSAGE_MAX}
        rows={3}
        aria-label="Your memory"
      />
      <span className="add-brick__count">
        {message.length}/{MESSAGE_MAX}
      </span>
      {status === 'error' && <p className="add-brick__error">Couldn't add your brick. Try again.</p>}
      <button className="join-race join-race--solid" disabled={!name.trim() || status === 'saving'}>
        {status === 'saving' ? 'Adding…' : 'Add brick'}
      </button>
    </form>
  )
}
