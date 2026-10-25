const PETAL_ANGLES = [0, 60, 120, 180, 240, 300]

export const Flake = ({ className }: { className: string }) => (
  <svg className={className} viewBox="-50 -50 100 100" aria-hidden="true">
    {PETAL_ANGLES.map((angle) => (
      <path key={angle} transform={`rotate(${angle})`} d="M0 -8 L10 -26 L0 -48 L-10 -26 Z" />
    ))}
  </svg>
)

const Logo = ({ size = 'small' }: { size?: 'small' | 'large' }) => {
  return (
    <div className={`logo logo--${size}`}>
      <div className="logo__mark">
        <Flake className="logo__flake" />
        <span className="logo__text">YYC’88</span>
      </div>
    </div>
  )
}

export default Logo
