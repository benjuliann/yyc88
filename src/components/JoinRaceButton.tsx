import { Link } from 'react-router-dom'

const JoinRaceButton = ({
  variant = 'solid',
  to,
  label = 'Start a race',
  onClick,
}: {
  variant?: 'solid' | 'outline'
  to?: string
  label?: string
  onClick?: () => void
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
    <button type="button" className={className} onClick={onClick}>
      {content}
    </button>
  )
}

export default JoinRaceButton
