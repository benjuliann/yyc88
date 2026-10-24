const PETAL_ANGLES = [0, 60, 120, 180, 240, 300]
const RINGS = [
  { cx: 18, cy: 18, color: '#2f6fd6' },
  { cx: 54, cy: 18, color: '#111' },
  { cx: 90, cy: 18, color: '#d7262e' },
  { cx: 36, cy: 34, color: '#f2b024' },
  { cx: 72, cy: 34, color: '#1f9a4a' },
]

const Logo = ({ size = 'small' }: { size?: 'small' | 'large' }) => {
  return (
    <div className={`logo logo--${size}`}>
      <div className="logo__mark">
        <svg className="logo__flake" viewBox="-50 -50 100 100" aria-hidden="true">
          {PETAL_ANGLES.map((angle) => (
            <path key={angle} transform={`rotate(${angle})`} d="M0 -8 L10 -26 L0 -48 L-10 -26 Z" />
          ))}
        </svg>
        <span className="logo__text">YYC’88</span>
      </div>
      {size === 'large' && (
        <svg className="logo__rings" viewBox="0 0 108 52" aria-hidden="true">
          {RINGS.map((ring) => (
            <circle key={ring.color} cx={ring.cx} cy={ring.cy} r="15" stroke={ring.color} />
          ))}
        </svg>
      )}
    </div>
  )
}

export default Logo
