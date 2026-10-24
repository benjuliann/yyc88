import { Link } from 'react-router-dom'

const JoinRaceButton = ({
  variant = 'solid',
  to,
  label = 'Join a race',
}: {
  variant?: 'solid' | 'outline'
  to?: string
  label?: string
}) => {
  const className = `join-race join-race--${variant}`
  const content = (
    <>
      {label} <span aria-hidden="true">→</span>
    </>
  )

  if (to) {
    return (
      <Link to={to} className={className}>
        {content}
      </Link>
    )
  }

  return (
    <button type="button" className={className}>
      {content}
    </button>
  )
}

export default JoinRaceButton
