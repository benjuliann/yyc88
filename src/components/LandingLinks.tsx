import { useEffect, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'

type Panel = 'about' | 'video' | 'credits'

const VIDEO_ID = 'JHVO30KxV7Y'
const REPO_URL = 'https://github.com/benjuliann/yyc88'

const HACKATHON = 'MRUHacks 2026'
const CREDITS = [
  { name: 'Benjamin Noel', linkedin: 'https://www.linkedin.com/in/benjuliannoel/' },
  { name: 'Haedyn Davac', linkedin: 'https://www.linkedin.com/in/hayden-davac/' },
  { name: 'James Baes', linkedin: 'https://www.linkedin.com/in/james-baes-37ba83321/' },
  { name: 'Talal Habib', linkedin: 'https://www.linkedin.com/in/talal-habib5/' },
]

const MAX_ZOOM = 6

// Full-screen image viewer: wheel to zoom, drag to pan, like the newspaper on the plaza page.
// It is its own modal dialog, so Escape closes it without closing the About modal underneath.
const Zoom = ({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) => {
  const ref = useRef<HTMLDialogElement>(null)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [dragging, setDragging] = useState(false)
  const last = useRef({ x: 0, y: 0 })

  useEffect(() => {
    ref.current?.showModal()
  }, [])

  const onWheel = (e: React.WheelEvent) => {
    const next = Math.min(MAX_ZOOM, Math.max(1, zoom * Math.exp(-e.deltaY * 0.002)))
    const ratio = next / zoom
    // keep the point under the cursor fixed while zooming
    const cx = e.clientX - window.innerWidth / 2
    const cy = e.clientY - window.innerHeight / 2
    setPan(next === 1 ? { x: 0, y: 0 } : { x: cx - (cx - pan.x) * ratio, y: cy - (cy - pan.y) * ratio })
    setZoom(next)
  }

  const onPointerDown = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    last.current = { x: e.clientX, y: e.clientY }
    setDragging(true)
  }

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging) return
    const dx = e.clientX - last.current.x
    const dy = e.clientY - last.current.y
    last.current = { x: e.clientX, y: e.clientY }
    setPan((p) => ({ x: p.x + dx, y: p.y + dy }))
  }

  return (
    <motion.dialog
      ref={ref}
      className="zoom"
      aria-label={alt}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      onCancel={(e) => {
        e.preventDefault()
        e.stopPropagation()
        onClose()
      }}
      onClick={(e) => e.target === ref.current && onClose()}
      onWheel={onWheel}
    >
      <img
        className={`zoom__img${dragging ? ' zoom__img--dragging' : ''}`}
        src={src}
        alt={alt}
        draggable={false}
        style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={() => setDragging(false)}
        onPointerCancel={() => setDragging(false)}
      />
    </motion.dialog>
  )
}

const Shot = ({ src, alt, onZoom }: { src: string; alt: string; onZoom: (shot: { src: string; alt: string }) => void }) => (
  <figure className="about__shot">
    <button type="button" aria-label={`Enlarge: ${alt}`} onClick={() => onZoom({ src, alt })}>
      <img src={src} alt={alt} />
    </button>
  </figure>
)

const About = () => {
  const [zoomed, setZoomed] = useState<{ src: string; alt: string } | null>(null)

  return (
    <div className="about">
      <p className="about__lede">How do we keep a city's memories alive?</p>
      <p>
        As Calgary evolves, some of the places that shaped its identity are being transformed or lost. The ski jumps
        from the 1988 Winter Olympics at Canada Olympic Park were decommissioned, and Olympic Plaza's engraved bricks
        have been removed as the plaza undergoes redevelopment. We wanted to create something that honours these places
        and the memories attached to them before they become just another part of Calgary's past.
      </p>
      <Shot
        src="/images/shot1.png"
        alt="The 3D Olympic Plaza at night, with the Calgary Herald front page from 1988"
        onZoom={setZoomed}
      />
      <p>
        For the prompt: <b>"Revitalize"</b>, we chose to bring a piece of Calgary's Olympic history back to life through an interactive
        multiplayer ski-jumping game. Players join from their phones, customize their skiers, and compete on a shared
        screen, using motion controls to balance and launch off the jump. But the experience doesn't end when the race
        is over. Inspired by the engraved bricks at Olympic Plaza, every player leaves their name on a virtual
        recreation of the plaza.
      </p>
      <div className="about__pair">
        <Shot src="/images/shot2.png" alt="A skier on the in-run of the ski jump" onZoom={setZoomed} />
        <Shot src="/images/shot3.png" alt="The phone controller with balance and take-off meters" onZoom={setZoomed} />
      </div>
      <p>
        As more people play, the plaza continues to fill with names, creating a growing digital monument that people
        can return to long after their race is finished. While we can't stop the city from changing, we can find new
        ways to preserve the memories attached to the places we care about.
      </p>
      <Shot src="/images/shot4.png" alt="Bricks engraved with players' names" onZoom={setZoomed} />
      <p className="about__closing">
        YYC '88 is our way of keeping a piece of Calgary's history alive, giving people a chance to experience it again,
        and leaving something behind for the future.
      </p>
      <AnimatePresence>
        {zoomed && <Zoom key={zoomed.src} src={zoomed.src} alt={zoomed.alt} onClose={() => setZoomed(null)} />}
      </AnimatePresence>
    </div>
  )
}

const Modal = ({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: ReactNode
}) => {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    ref.current?.showModal()
  }, [])

  // The dialog fills the screen as the dimmed backdrop, so it can fade out with the panel.
  // Escape is routed through onClose so AnimatePresence plays the exit before unmounting.
  return (
    <motion.dialog
      ref={ref}
      className="modal"
      aria-label={title}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      onClick={(e) => e.target === ref.current && onClose()}
    >
      <motion.div
        className="modal__panel"
        initial={{ y: 16, scale: 0.98 }}
        animate={{ y: 0, scale: 1 }}
        exit={{ y: 16, scale: 0.98 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      >
        <h2 className="modal__title">{title}</h2>
        {children}
        <button type="button" className="modal__close" aria-label="Close" onClick={onClose}>
          ×
        </button>
      </motion.div>
    </motion.dialog>
  )
}

const Icon = ({ children }: { children: ReactNode }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    {children}
  </svg>
)

const LandingLinks = () => {
  const [panel, setPanel] = useState<Panel | null>(null)
  const close = () => setPanel(null)

  return (
    <>
      <motion.div
        className="landing__links"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6, duration: 0.8 }}
      >
        <button type="button" className="icon-btn" aria-label="About the project" title="About" onClick={() => setPanel('about')}>
          <Icon>
            <circle cx="12" cy="12" r="9" />
            <path d="M12 11v6M12 7.5v.5" />
          </Icon>
        </button>
        <button type="button" className="icon-btn" aria-label="Watch the trailer" title="Watch the trailer" onClick={() => setPanel('video')}>
          <Icon>
            <path d="M9 7v10l8-5z" />
          </Icon>
        </button>
        <button type="button" className="icon-btn" aria-label="Credits" title="Credits" onClick={() => setPanel('credits')}>
          <Icon>
            <circle cx="9" cy="9" r="3" />
            <path d="M3 19c0-3 2.7-5 6-5s6 2 6 5M16 6.3a3 3 0 0 1 0 5.4M18 14.3c1.8.7 3 2.2 3 4.7" />
          </Icon>
        </button>
      </motion.div>

      <AnimatePresence>
        {panel === 'about' && (
          <Modal key="about" title="About" onClose={close}>
            <About />
          </Modal>
        )}
        {panel === 'video' && (
          <Modal key="video" title="Trailer" onClose={close}>
            <iframe
              className="modal__video"
              src={`https://www.youtube.com/embed/${VIDEO_ID}?autoplay=1`}
              title="YYC '88 trailer"
              allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
            />
          </Modal>
        )}
        {panel === 'credits' && (
          <Modal key="credits" title="Credits" onClose={close}>
            <div className="credits">
              <section>
                <h3 className="credits__heading">Developers</h3>
                <ul>
                  {CREDITS.map(({ name, linkedin }) => (
                    <li key={name}>
                      <a href={linkedin} target="_blank" rel="noreferrer">
                        {name}
                      </a>
                    </li>
                  ))}
                </ul>
              </section>
              <section>
                <h3 className="credits__heading">Built for</h3>
                <ul>
                  <li>{HACKATHON}</li>
                  <li>
                    <a href={REPO_URL} target="_blank" rel="noreferrer">
                      <u>Source on GitHub</u>
                    </a>
                  </li>
                </ul>
              </section>
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </>
  )
}

export default LandingLinks
