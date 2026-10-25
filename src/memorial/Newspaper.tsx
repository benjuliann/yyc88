import { useEffect, useRef, useState } from 'react'

const SRC = '/images/calgaryherald1988_02-29.png'
const W = 330
const H = W * (1936 / 1103)
const MARGIN = 24
const MIN_ZOOM = 1
const MAX_ZOOM = 6

const Newspaper = () => {
  const [open, setOpen] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [vp, setVp] = useState({ w: window.innerWidth, h: window.innerHeight })
  const drag = useRef({ x: 0, y: 0, moved: false })

  useEffect(() => {
    const onResize = () => setVp({ w: window.innerWidth, h: window.innerHeight })
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const close = () => {
    setOpen(false)
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const fit = Math.min((vp.w * 0.9) / W, (vp.h * 0.9) / H)
  const scale = open ? fit * zoom : 1
  const x = open ? (vp.w - W * scale) / 2 + pan.x : MARGIN
  const y = open ? (vp.h - H * scale) / 2 + pan.y : vp.h - H / 2

  const onWheel = (e: React.WheelEvent) => {
    if (!open) return
    const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom * Math.exp(-e.deltaY * 0.002)))
    const ratio = next / zoom
    // keep the point under the cursor fixed while zooming
    const cx = e.clientX - vp.w / 2
    const cy = e.clientY - vp.h / 2
    setPan(next === MIN_ZOOM ? { x: 0, y: 0 } : { x: cx - (cx - pan.x) * ratio, y: cy - (cy - pan.y) * ratio })
    setZoom(next)
  }

  const onPointerDown = (e: React.PointerEvent) => {
    if (!open) return
    e.currentTarget.setPointerCapture(e.pointerId)
    drag.current = { x: e.clientX, y: e.clientY, moved: false }
    setDragging(true)
  }

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging) return
    const dx = e.clientX - drag.current.x
    const dy = e.clientY - drag.current.y
    if (Math.abs(dx) + Math.abs(dy) > 3) drag.current.moved = true
    drag.current.x = e.clientX
    drag.current.y = e.clientY
    setPan((p) => ({ x: p.x + dx, y: p.y + dy }))
  }

  return (
    <>
      <div
        className={`newspaper-backdrop${open ? ' newspaper-backdrop--open' : ''}`}
        onClick={close}
      />
      <img
        className={`newspaper${open ? ' newspaper--open' : ''}${dragging ? ' newspaper--dragging' : ''}`}
        src={SRC}
        alt="Calgary Herald, February 29, 1988"
        width={W}
        height={H}
        draggable={false}
        style={{ transform: `translate(${x}px, ${y}px) scale(${scale})` }}
        onClick={() => !open && setOpen(true)}
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={() => setDragging(false)}
        onPointerCancel={() => setDragging(false)}
      />
    </>
  )
}

export default Newspaper
