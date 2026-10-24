import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { GLTFLoader, type GLTF } from 'three/addons/loaders/GLTFLoader.js'
import ScorePopup from '../components/ScorePopup'
import { MODELS, DISTANCES, clipFile, fixBlenderLights, type Manifest } from '../lib/skiModels'
import '../styles/ski-jump.css'

// All 41 clips are identical up to the TAKEOFF marker (frame 112 in every Blender scene),
// so the in-run plays from any clip and we swap to the earned distance at takeoff.
const FPS = 24
const TAKEOFF_T = 112 / FPS
const INRUN_CLIP = 100

// Balance feel: the skier's sideways position is unstable (drifts away from the centre line),
// gusts knock it around, and ←/→ steer back. The needle shows that position.
// Tweak these to make the game easier or harder.
const DRIFT = 2.2
const GUST = 5
const PUSH = 6
const DAMPING = 0.97

// Timing: pressing this many seconds early (or not at all) scores zero.
const TIMING_WINDOW = 0.75

// Steering look: how far the skier slides off the centre line (m), how fast they steer
// after takeoff (m/s), and how far they lean into a turn (radians).
const MAX_SLIDE = 1.5
const AIR_STEER = 2.5
const LEAN = 0.3

// Wipeout: hitting the side on the ground freezes the pose and tumbles the skier down the
// slope (spin in rad/s, both decaying), then resets to the start gate.
const TUMBLE_TIME = 2.5
const TUMBLE_SPIN = 10

// Wraps the clip's skier in a group we can slide and lean without fighting the baked animation
// (the mixer rewrites the skier's own transform every frame).
function rigSkier(root: THREE.Object3D) {
  if (!root.userData.rig) {
    let skier: THREE.Object3D | undefined
    root.traverse((o) => {
      if (!skier && o.name.includes('trajectory')) skier = o
    })
    const rig = new THREE.Group()
    root.add(rig)
    rig.add(skier!)
    root.userData.rig = { rig, skier: skier! }
  }
  return root.userData.rig as { rig: THREE.Group; skier: THREE.Object3D }
}

type Phase = 'loading' | 'ready' | 'inrun' | 'flight' | 'done' | 'crash'
type Takeoff = { label: string; balance: number; timing: number }

function rateTakeoff(balance: number, pressT: number | null): Takeoff & { distance: number } {
  const early = pressT === null ? Infinity : TAKEOFF_T - pressT
  const timing = Math.max(0.1, 1 - early / TIMING_WINDOW)
  const label = pressT === null ? 'TOO LATE!' : early < 0.12 ? 'PERFECT!' : early < 0.35 ? 'GOOD' : 'EARLY!'
  const raw = 200 * balance * timing
  const distance = Math.min(200, Math.max(0, Math.round(raw / 5) * 5))
  return { label, balance, timing, distance }
}

export default function SkiJumpPage() {
  const mountRef = useRef<HTMLDivElement>(null)
  const needleRef = useRef<HTMLDivElement>(null)
  const lipFillRef = useRef<HTMLDivElement>(null)
  const [phase, setPhase] = useState<Phase>('loading')
  const [takeoff, setTakeoff] = useState<Takeoff | null>(null)
  const [popup, setPopup] = useState<{ distance: number; id: number } | null>(null)
  const [crashed, setCrashed] = useState(false)

  useEffect(() => {
    const mount = mountRef.current!
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.setSize(mount.clientWidth, mount.clientHeight)
    mount.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0xbfd8f0)
    scene.add(new THREE.HemisphereLight(0xffffff, 0x8a8a7a, 1))

    const loader = new GLTFLoader()
    const timer = new THREE.Timer()
    let disposed = false

    // Parsed clips, so the takeoff swap is instant once a clip has been fetched.
    const clips = new Map<number, Promise<GLTF>>()
    const getClip = (m: number) => {
      if (!clips.has(m)) clips.set(m, loader.loadAsync(clipFile(m)))
      return clips.get(m)!
    }

    const landingTimes = new Map<number, number>()
    const manifest = fetch(`${MODELS}/manifest.json`)
      .then((r) => r.json())
      .then((m: Manifest) => {
        for (const c of m.clips) landingTimes.set(c.distance_m, c.landing_frame / c.fps)
      })

    Promise.all([loader.loadAsync(`${MODELS}/calgary-1988-sports-environment.glb`), getClip(INRUN_CLIP), manifest]).then(
      ([env, inrun]) => {
        if (disposed) return
        fixBlenderLights(env.scene)
        scene.add(env.scene)
        toGate(inrun)
        // Warm the rest in the background, one at a time.
        DISTANCES.reduce((p, m) => p.then(() => (disposed ? undefined : getClip(m).then(() => undefined))), Promise.resolve())
      },
    )

    // --- current clip ---
    let root: THREE.Object3D | null = null
    let mixer: THREE.AnimationMixer | null = null
    let action: THREE.AnimationAction | null = null
    let cam: THREE.PerspectiveCamera | null = null
    let rig: ReturnType<typeof rigSkier> | null = null

    const play = (gltf: GLTF, startTime: number) => {
      if (root) scene.remove(root)
      mixer?.stopAllAction()
      root = gltf.scene
      scene.add(root)
      cam = (gltf.cameras[0] as THREE.PerspectiveCamera) ?? null
      rig = rigSkier(root)
      mixer = new THREE.AnimationMixer(root)
      action = mixer.clipAction(gltf.animations[0])
      action.setLoop(THREE.LoopOnce, 1)
      action.clampWhenFinished = true
      action.play()
      action.time = startTime
      mixer.addEventListener('finished', () => {
        if (game.phase !== 'flight') return
        game.phase = 'done'
        setPhase('done')
      })
    }

    // Show the skier waiting at the start gate until the player starts.
    const toGate = (inrun: GLTF) => {
      Object.assign(game, { phase: 'ready', crashed: false, slide: 0, lean: 0, balance: 0 })
      play(inrun, 0)
      action!.paused = true
      setCrashed(false)
      setPhase('ready')
    }

    // --- game state (plain object: updated every frame, mirrored to React on phase changes) ---
    const game = {
      phase: 'loading' as Phase,
      balance: 0,
      velocity: 0,
      balanceSum: 0,
      balanceTime: 0,
      pressT: null as number | null,
      distance: 0,
      landed: false,
      slide: 0,
      lean: 0,
      crashed: false,
      crashTime: 0,
      left: false,
      right: false,
    }

    const start = async () => {
      const inrun = await getClip(INRUN_CLIP)
      if (disposed) return
      Object.assign(game, { phase: 'inrun', balance: 0, velocity: 0, balanceSum: 0, balanceTime: 0, pressT: null, landed: false, slide: 0 })
      setTakeoff(null)
      setPopup(null)
      setPhase('inrun')
      play(inrun, 0)
    }

    const takeOff = () => {
      const result = rateTakeoff(game.balanceSum / Math.max(game.balanceTime, 1e-6), game.pressT)
      game.distance = result.distance
      game.phase = 'flight'
      setTakeoff(result)
      setPhase('flight')
      const t = action!.time
      action!.paused = true // holds on the lip only if the clip isn't fetched yet
      getClip(result.distance).then((gltf) => {
        if (!disposed && game.phase === 'flight') play(gltf, t)
      })
    }

    const onKey = (e: KeyboardEvent, down: boolean) => {
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', ' '].includes(e.key)) e.preventDefault()
      if (e.key === 'ArrowLeft') game.left = down
      if (e.key === 'ArrowRight') game.right = down
      if (!down || e.repeat || (e.key !== 'ArrowUp' && e.key !== ' ')) return
      if (game.phase === 'ready' || game.phase === 'done') start()
      else if (game.phase === 'inrun' && game.pressT === null) game.pressT = action!.time
    }
    const onKeyDown = (e: KeyboardEvent) => onKey(e, true)
    const onKeyUp = (e: KeyboardEvent) => onKey(e, false)
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)

    const onResize = () => renderer.setSize(mount.clientWidth, mount.clientHeight)
    window.addEventListener('resize', onResize)

    // Wipeout state: frozen pose/camera, tumble displacement, velocity and spin.
    const prevPos = new THREE.Vector3()
    const velocity = new THREE.Vector3()
    const crashSkier = new THREE.Vector3()
    const crashCam = new THREE.Vector3()
    const crashVel = new THREE.Vector3()
    const crashDisp = new THREE.Vector3()
    const spinAxis = new THREE.Vector3()
    const spinQ = new THREE.Quaternion()
    const crashQ = new THREE.Quaternion()
    const pivot = new THREE.Vector3()
    const UP = new THREE.Vector3(0, 1, 0)

    const wipeout = () => {
      game.phase = 'crash'
      game.crashed = true
      game.crashTime = 0
      action!.paused = true
      crashSkier.copy(rig!.skier.position)
      crashCam.copy(cam!.position)
      // Keep the speed we had, plus a shove off the side we hit.
      crashVel.copy(velocity).addScaledVector(lateral, Math.sign(game.slide) * 3)
      crashDisp.set(0, 0, 0)
      crashQ.identity()
      // Forward roll around the sideways axis, plus some cartwheel around the travel direction.
      const travel = crashVel.lengthSq() > 1e-3 ? crashVel.clone().normalize() : runAxis.clone()
      spinAxis.crossVectors(travel, UP).normalize().addScaledVector(travel, 0.6 * Math.sign(game.slide)).normalize()
      setPopup(null)
      setTakeoff(null)
      setCrashed(true)
      setPhase('crash')
    }

    const lateral = new THREE.Vector3()
    const runAxis = new THREE.Vector3(0, 0, 1) // the jump runs along world Z
    const leanQ = new THREE.Quaternion()
    const camRight = new THREE.Vector3()

    renderer.setAnimationLoop((time) => {
      timer.update(time)
      const dt = Math.min(timer.getDelta(), 0.1)
      mixer?.update(dt)
      const push = (game.right ? 1 : 0) - (game.left ? 1 : 0)

      if (game.phase === 'inrun' && action) {
        game.velocity += (game.balance * DRIFT + (Math.random() - 0.5) * GUST + push * PUSH) * dt
        game.velocity *= DAMPING
        game.balance += game.velocity * dt
        const hitSide = Math.abs(game.balance) >= 1
        if (hitSide) game.balance = Math.sign(game.balance)
        game.balanceSum += (1 - Math.abs(game.balance)) * dt
        game.balanceTime += dt
        if (needleRef.current) needleRef.current.style.left = `${50 + game.balance * 50}%`
        if (lipFillRef.current) lipFillRef.current.style.width = `${Math.min(action.time / TAKEOFF_T, 1) * 100}%`
        game.slide = game.balance * MAX_SLIDE
        if (hitSide) wipeout()
        else if (action.time >= TAKEOFF_T) takeOff()
      } else if (game.phase === 'flight' || game.phase === 'done') {
        game.slide = THREE.MathUtils.clamp(game.slide + push * AIR_STEER * dt, -MAX_SLIDE, MAX_SLIDE)
        // On the ground (after landing) the edge of the hill is a wipeout too; in the air it just stops you.
        const onGround = game.phase === 'done' || game.landed
        if (onGround && Math.abs(game.slide) >= MAX_SLIDE) wipeout()
      }

      if (game.phase === 'crash') {
        game.crashTime += dt
        crashVel.multiplyScalar(Math.exp(-1.5 * dt))
        crashDisp.addScaledVector(crashVel, dt)
        spinQ.setFromAxisAngle(spinAxis, TUMBLE_SPIN * Math.exp(-1.2 * game.crashTime) * dt)
        crashQ.premultiply(spinQ)
        if (game.crashTime >= TUMBLE_TIME) getClip(INRUN_CLIP).then((g) => !disposed && toGate(g))
      }

      if (rig && game.crashed && cam) {
        // Tumble around the body's middle, carried down the slope; camera trails along.
        pivot.copy(crashSkier).addScaledVector(UP, 0.9)
        rig.rig.quaternion.copy(crashQ)
        rig.rig.position.copy(pivot).applyQuaternion(crashQ).negate().add(pivot)
          .addScaledVector(lateral, game.slide).add(crashDisp)
        cam.position.copy(crashCam).addScaledVector(crashDisp, 0.85)
      } else if (rig && cam) {
        // Track speed for a wipeout.
        if (dt > 0) velocity.copy(rig.skier.position).sub(prevPos).divideScalar(dt)
        prevPos.copy(rig.skier.position)
        // Slide across the run and lean into the turn, pivoting around the skier.
        game.lean = THREE.MathUtils.damp(game.lean, push * LEAN, 8, dt)
        // Pick the side of the run that is "right" on screen for the current camera.
        camRight.setFromMatrixColumn(cam.matrixWorld, 0)
        lateral.set(Math.sign(camRight.x) || 1, 0, 0)
        leanQ.setFromAxisAngle(runAxis, -game.lean * lateral.x)
        const p = rig.skier.position
        rig.rig.quaternion.copy(leanQ)
        rig.rig.position.copy(p).applyQuaternion(leanQ).negate().add(p).addScaledVector(lateral, game.slide)
      }

      if (game.phase === 'flight' && action && !game.landed) {
        const landAt = landingTimes.get(game.distance)
        if (landAt !== undefined && action.time >= landAt) {
          game.landed = true
          setPopup({ distance: game.distance, id: performance.now() })
        }
      }

      if (cam) {
        cam.aspect = mount.clientWidth / mount.clientHeight
        cam.updateProjectionMatrix()
        renderer.render(scene, cam)
      }
    })

    return () => {
      disposed = true
      renderer.setAnimationLoop(null)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('resize', onResize)
      renderer.dispose()
      mount.removeChild(renderer.domElement)
    }
  }, [])

  return (
    <div className="ski-jump">
      <div ref={mountRef} className="ski-jump__canvas" />

      {phase === 'loading' && <div className="ski-jump__banner">LOADING…</div>}

      {crashed && (
        <div className="ski-jump__takeoff">
          <div className="ski-jump__takeoff-label">WIPEOUT!</div>
          <div className="ski-jump__help">YOU HIT THE SIDE</div>
        </div>
      )}

      {(phase === 'ready' || phase === 'done') && (
        <div className="ski-jump__banner ski-jump__banner--bottom">
          <div className="ski-jump__blink">PRESS ↑ TO {phase === 'done' ? 'JUMP AGAIN' : 'JUMP'}</div>
          <div className="ski-jump__help">&lt; &gt; BALANCE &nbsp;&nbsp; ↑ TAKE OFF AT THE LIP</div>
        </div>
      )}

      {phase === 'inrun' && (
        <div className="ski-jump__hud">
          <div className="ski-jump__meter-label">BALANCE</div>
          <div className="ski-jump__meter">
            <div className="ski-jump__meter-zone" />
            <div ref={needleRef} className="ski-jump__needle" />
          </div>
          <div className="ski-jump__meter-label">TAKE-OFF ↑</div>
          <div className="ski-jump__lip">
            <div ref={lipFillRef} className="ski-jump__lip-fill" />
          </div>
        </div>
      )}

      {takeoff && phase === 'flight' && !popup && (
        <div className="ski-jump__takeoff">
          <div className="ski-jump__takeoff-label">{takeoff.label}</div>
          <div className="ski-jump__help">
            BALANCE {Math.round(takeoff.balance * 100)}% × TIMING {Math.round(takeoff.timing * 100)}%
          </div>
        </div>
      )}

      {popup && <ScorePopup key={popup.id} distance={popup.distance} />}
    </div>
  )
}
