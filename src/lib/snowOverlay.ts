// Screen-space snowfall drawn on a 2D canvas over the 3D view. Flakes drift down at rest;
// when the camera moves they stream past the opposite way (and spread out if it moves
// into the scene), stretching into short streaks the faster it goes.
const FLAKES = 220
const FALL = 35 // px/s at rest, nearest flakes
const PX_PER_MPS = 38 // screen flow per m/s of camera movement, nearest flakes
const STREAK = 0.02 // seconds of motion each flake's trail shows
const MAX_STREAK = 28 // px

type Flake = { x: number; y: number; z: number; sway: number }

export function createSnowOverlay(container: HTMLElement) {
  const canvas = document.createElement('canvas')
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none'
  container.appendChild(canvas)
  const ctx = canvas.getContext('2d')!
  let w = 0
  let h = 0
  // Smoothed camera-space velocity (m/s): x right, y up, z toward the viewer.
  const vel = { x: 0, y: 0, z: 0 }

  const resize = () => {
    const dpr = window.devicePixelRatio || 1
    w = container.clientWidth
    h = container.clientHeight
    canvas.width = w * dpr
    canvas.height = h * dpr
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  }
  resize()

  // z: 0.3 (far, small, slow) .. 1 (near, big, fast)
  const flakes: Flake[] = Array.from({ length: FLAKES }, () => ({
    x: Math.random() * w,
    y: Math.random() * h,
    z: 0.3 + Math.random() * 0.7,
    sway: Math.random() * Math.PI * 2,
  }))

  const respawn = (f: Flake, forward: number, sideways: number) => {
    f.z = 0.3 + Math.random() * 0.7
    if (forward > sideways) {
      // Moving into the scene: new flakes come from around the middle and spread out.
      const a = Math.random() * Math.PI * 2
      const r = Math.random() * 0.3 * Math.min(w, h)
      f.x = w / 2 + Math.cos(a) * r
      f.y = h / 2 + Math.sin(a) * r
    } else {
      // Otherwise wrap to the opposite edge so the stream is continuous.
      if (f.x < -20) f.x = w + 10
      else if (f.x > w + 20) f.x = -10
      if (f.y < -20) f.y = h + 10
      else if (f.y > h + 20) f.y = -10
    }
  }

  const update = (dt: number, camVel: { x: number; y: number; z: number }) => {
    // Ease toward the new velocity so the effect doesn't jitter.
    const k = Math.min(1, dt * 4)
    vel.x += (camVel.x - vel.x) * k
    vel.y += (camVel.y - vel.y) * k
    vel.z += (camVel.z - vel.z) * k
    const forward = Math.max(0, -vel.z) // camera looks down -Z
    const sideways = Math.hypot(vel.x, vel.y)

    ctx.clearRect(0, 0, w, h)
    ctx.lineCap = 'round'
    ctx.shadowColor = 'rgba(30, 50, 90, 0.5)'
    ctx.shadowBlur = 3
    const cx = w / 2
    const cy = h / 2
    for (const f of flakes) {
      f.sway += dt * 1.5
      const dx = f.x - cx
      const dy = f.y - cy
      const dist = Math.hypot(dx, dy) || 1
      // Snow is still in the world, so it flows opposite to the camera on screen.
      const s = PX_PER_MPS * f.z
      const vx = Math.sin(f.sway) * 10 * f.z - vel.x * s + (dx / dist) * forward * s * 0.6
      const vy = FALL * f.z + vel.y * s + (dy / dist) * forward * s * 0.6
      f.x += vx * dt
      f.y += vy * dt
      if (f.x < -20 || f.x > w + 20 || f.y > h + 20 || f.y < -20) respawn(f, forward, sideways)

      // A soft round flake, stretched into a short streak along its motion when fast.
      const len = Math.min(Math.hypot(vx, vy) * STREAK, MAX_STREAK)
      const sp = Math.hypot(vx, vy) || 1
      ctx.strokeStyle = `rgba(255, 255, 255, ${0.65 + 0.35 * f.z})`
      ctx.lineWidth = 1.8 + 3.2 * f.z
      ctx.beginPath()
      ctx.moveTo(f.x, f.y)
      ctx.lineTo(f.x - (vx / sp) * len, f.y - (vy / sp) * len + 0.01)
      ctx.stroke()
    }
  }

  const dispose = () => canvas.remove()

  return { update, resize, dispose }
}
