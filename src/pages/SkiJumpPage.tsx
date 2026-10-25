import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { GLTFLoader, type GLTF } from 'three/addons/loaders/GLTFLoader.js'
import ScorePopup from '../components/ScorePopup'
import { MODELS, DISTANCES, clipFile, fallFile, fixBlenderLights, type Manifest } from '../lib/skiModels'
import { playApplause, playCountdownBeep, playScoreSound, playWipeoutSound, stopCrowdSounds, syncSlopeSounds } from '../lib/scoreSounds'
import { createSnowOverlay } from '../lib/snowOverlay'
import { applySkierConfig, loadSkierAccessories } from '../lib/skierCustomization'
import { loadSkier } from './Menu'
import '../styles/ski-jump.css'

// All 41 clips are identical up to takeoff (takeoff_frame 112 in every clip of the manifest),
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

// The takeoff rating plays the earned distance's landing sound, pitched down by this playback rate.
const TAKEOFF_SOUND_RATE = 0.8

// Steering look: how fast they steer after takeoff (m/s), how far they lean into a turn
// (radians), and how much of the sideways movement the camera follows (0 = none, 1 = all).
const AIR_STEER = 4
const LEAN = 0.3
const CAM_FOLLOW = 0.6
// The manifest's half widths are for the skier's centre; this keeps the skis inside the edge.
const SKIER_HALF_WIDTH = 0.43

// Wipeout: hitting the side on the ground freezes the pose and tumbles the skier down the
// slope (spin in rad/s, both decaying), then resets to the start gate.
const TUMBLE_TIME = 2.5
const TUMBLE_SPIN = 10

// Intro: a 3-2-1 countdown while the camera holds on the whole-hill overview, then sweeps
// down to the skier at the gate (seconds).
const COUNTDOWN = 3
const PAN_START = 0.4
const PAN_END = 2.8

// In a race room: seconds to show the score after the jump before the race ends.
const FINISH_DELAY = 3


type Phase = 'loading' | 'ready' | 'countdown' | 'inrun' | 'flight' | 'done' | 'crash' | 'fall'
type Takeoff = { label: string; balance: number; timing: number }

function rateTakeoff(balance: number, pressT: number | null): Takeoff & { distance: number } {
  const early = pressT === null ? Infinity : TAKEOFF_T - pressT
  const timing = Math.max(0.1, 1 - early / TIMING_WINDOW)
  const label = pressT === null ? 'TOO LATE!' : early < 0.12 ? 'PERFECT!' : early < 0.35 ? 'GOOD' : 'EARLY!'
  const raw = 200 * balance * timing
  const distance = Math.min(200, Math.max(0, Math.round(raw / 5) * 5))
  return { label, balance, timing, distance }
}

// Half width of the landing hill at world Z, from the manifest profile.
function landingHalfWidth(profile: [number, number][], z: number) {
  if (z <= profile[0][0]) return profile[0][1]
  for (let i = 1; i < profile.length; i++) {
    const [z1, w1] = profile[i]
    if (z <= z1) {
      const [z0, w0] = profile[i - 1]
      return THREE.MathUtils.lerp(w0, w1, (z - z0) / (z1 - z0))
    }
  }
  return profile[profile.length - 1][1]
}

// `onFinish` is set when the jump is part of a race: it's called once the jump is done.
export default function SkiJumpPage({ onFinish }: { onFinish?: () => void }) {
  const mountRef = useRef<HTMLDivElement>(null)
  const needleRef = useRef<HTMLDivElement>(null)
  const lipFillRef = useRef<HTMLDivElement>(null)
  const [phase, setPhase] = useState<Phase>('loading')
  const [takeoff, setTakeoff] = useState<Takeoff | null>(null)
  const [popup, setPopup] = useState<{ distance: number; id: number } | null>(null)
  // Why the skier wiped out (shown under WIPEOUT!), or null.
  const [crashed, setCrashed] = useState<string | null>(null)
  // "3", "2", "1" during the countdown, then "GO!" as the run starts.
  const [count, setCount] = useState<string | null>(null)

  useEffect(() => {
    if (phase !== 'done' || !onFinish) return
    const timeout = setTimeout(onFinish, FINISH_DELAY * 1000)
    return () => clearTimeout(timeout)
  }, [phase, onFinish])

  useEffect(() => {
    const mount = mountRef.current!
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.setSize(mount.clientWidth, mount.clientHeight)
    mount.appendChild(renderer.domElement)
    const snow = createSnowOverlay(mount)

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0xbfd8f0)
    scene.add(new THREE.HemisphereLight(0xffffff, 0x8a8a7a, 1))

    const loader = new GLTFLoader()
    // The player's skier from the customizer (saved in this browser), applied to every clip as it loads.
    const skier = loadSkier()
    const accessories = loadSkierAccessories(`${MODELS}/skier-accessories.glb`)
    const loadSkierClip = (url: string) =>
      Promise.all([loader.loadAsync(url), accessories]).then(([gltf, acc]) => {
        applySkierConfig(gltf.scene, acc, skier)
        return gltf
      })
    const timer = new THREE.Timer()
    let disposed = false

    // Parsed clips, so the takeoff swap is instant once a clip has been fetched.
    const clips = new Map<number, Promise<GLTF>>()
    const getClip = (m: number) => {
      if (!clips.has(m)) clips.set(m, loadSkierClip(clipFile(m)))
      return clips.get(m)!
    }
    // Crash-on-landing versions, fetched at takeoff for the earned distance.
    const falls = new Map<number, GLTF>()
    const getFall = (m: number) => {
      if (!falls.has(m)) loadSkierClip(fallFile(m)).then((g) => falls.set(m, g))
    }

    const landingTimes = new Map<number, number>()
    let inrunLimit = 0
    let landingProfile: [number, number][] = []
    const manifest = fetch(`${MODELS}/manifest.json`)
      .then((r) => r.json())
      .then((m: Manifest) => {
        for (const c of m.clips) landingTimes.set(c.distance_m, c.landing_frame / c.fps)
        inrunLimit = m.inrun_half_width_m - SKIER_HALF_WIDTH
        landingProfile = m.landing_half_width_profile_m
      })

    Promise.all([loader.loadAsync(`${MODELS}/calgary-1988-sports-environment.glb`), getClip(INRUN_CLIP), manifest]).then(
      ([env, inrun]) => {
        if (disposed) return
        fixBlenderLights(env.scene)
        scene.add(env.scene)
        envRoot = env.scene
        // The environment's "Entire ski hill overview" camera is where the intro starts.
        const overview = env.cameras[0] as THREE.PerspectiveCamera | undefined
        if (overview) {
          scene.updateMatrixWorld()
          overview.getWorldPosition(introFrom.pos)
          overview.getWorldQuaternion(introFrom.quat)
          introFrom.fov = overview.fov
          hasOverview = true
        }
        toGate(inrun)
        // Warm the rest in the background, one at a time.
        DISTANCES.reduce((p, m) => p.then(() => (disposed ? undefined : getClip(m).then(() => undefined))), Promise.resolve())
        getFall(INRUN_CLIP) // used for rail wipeouts on the in-run
      },
    )

    // --- current clip ---
    // `steer` (from Blender) sits between the animated trajectory root and the body and is never
    // animated, so we can slide (local X = world X), lean and tumble the skier through it.
    let root: THREE.Object3D | null = null
    let mixer: THREE.AnimationMixer | null = null
    let action: THREE.AnimationAction | null = null
    let cam: THREE.PerspectiveCamera | null = null
    let steer: THREE.Object3D | null = null
    // What we added to the baked camera last frame. The mixer only rewrites values that changed,
    // so while the clip is paused (crash, finished) it won't reset the camera for us.
    const camOffset = new THREE.Vector3()

    const play = (gltf: GLTF, startTime: number) => {
      cam?.position.sub(camOffset)
      camOffset.set(0, 0, 0)
      if (root) scene.remove(root)
      mixer?.stopAllAction()
      root = gltf.scene
      root.position.set(0, 0, 0) // cached clips may still carry a side-wipeout shift
      shiftedFall = false
      scene.add(root)
      cam = (gltf.cameras[0] as THREE.PerspectiveCamera) ?? null
      steer = null
      root.traverse((o) => {
        if (!steer && o.name.endsWith('steer')) steer = o
      })
      // Clips are cached and replayed, so clear what a previous run left on the steer node.
      steer!.position.set(0, 0, 0)
      steer!.quaternion.identity()
      mixer = new THREE.AnimationMixer(root)
      action = mixer.clipAction(gltf.animations[0])
      action.setLoop(THREE.LoopOnce, 1)
      action.clampWhenFinished = true
      action.play()
      action.time = startTime
      mixer.addEventListener('finished', () => {
        if (game.phase === 'fall') getClip(INRUN_CLIP).then((g) => !disposed && toGate(g))
        if (game.phase !== 'flight') return
        game.phase = 'done'
        setPhase('done')
      })
    }

    // Show the skier waiting at the start gate until the player starts.
    const toGate = (inrun: GLTF) => {
      Object.assign(game, { phase: 'ready', crashed: false, slide: 0, lean: 0, balance: 0 })
      resetVelocity = true // the skier teleports back to the gate
      play(inrun, 0)
      action!.paused = true
      setCrashed(null)
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
      slide: 0, // metres from the centre line, + = screen right
      lean: 0,
      crashed: false,
      crashTime: 0,
      countdownTime: 0,
      left: false,
      right: false,
    }

    // Intro camera: flies from the overview pose to the tracking camera's pose at the gate.
    const introCam = new THREE.PerspectiveCamera(50, 1, 0.5, 120000)
    const introFrom = { pos: new THREE.Vector3(), quat: new THREE.Quaternion(), fov: 50 }
    const introTo = { pos: new THREE.Vector3(), quat: new THREE.Quaternion(), fov: 50 }
    let hasOverview = false

    // ↑ at the gate (or after a jump): reset to the gate, then count down while the camera sweeps in.
    const start = async () => {
      const inrun = await getClip(INRUN_CLIP)
      if (disposed) return
      Object.assign(game, { phase: 'countdown', countdownTime: 0, balance: 0, velocity: 0, balanceSum: 0, balanceTime: 0, pressT: null, landed: false, slide: 0, lean: 0 })
      setTakeoff(null)
      setPopup(null)
      setCount(String(COUNTDOWN))
      stopCrowdSounds()
      playCountdownBeep()
      setPhase('countdown')
      play(inrun, 0)
      action!.paused = true
      resetVelocity = true // may be coming back from the end of the hill
      mixer!.update(0)
      root!.updateMatrixWorld()
      cam!.getWorldPosition(introTo.pos)
      cam!.getWorldQuaternion(introTo.quat)
      introTo.fov = cam!.fov
    }

    const go = () => {
      game.phase = 'inrun'
      action!.paused = false
      setCount('GO!')
      setPhase('inrun')
    }

    const takeOff = () => {
      const result = rateTakeoff(game.balanceSum / Math.max(game.balanceTime, 1e-6), game.pressT)
      game.distance = result.distance
      game.phase = 'flight'
      setTakeoff(result)
      playScoreSound(result.distance, TAKEOFF_SOUND_RATE)
      setPhase('flight')
      const t = action!.time
      action!.paused = true // holds on the lip only if the clip isn't fetched yet
      getClip(result.distance).then((gltf) => {
        if (!disposed && game.phase === 'flight') play(gltf, t)
      })
      getFall(result.distance)
    }

    // Hit the side: play the crash part of a fall clip (from its landing frame) moved to where the
    // skier is. Each frame the clip is raised/lowered so the skier keeps the same height above the
    // snow as in Blender, since the slope here differs from the landing hill it was made for.
    let envRoot: THREE.Object3D | null = null
    let shiftedFall = false
    const fallShiftZ = { value: 0 }
    const sideFall = (fall: GLTF, distance: number) => {
      const here = steer!.parent!.position.clone()
      game.phase = 'fall'
      game.landed = true
      play(fall, landingTimes.get(distance)!)
      mixer!.update(0) // pose at the start of the crash
      const start = steer!.parent!.position
      fallShiftZ.value = here.z - start.z
      root!.position.set(0, here.y - start.y, fallShiftZ.value)
      shiftedFall = true
      resetVelocity = true // the clip's own coordinates jump; don't read that as speed
      setTakeoff(null)
      setPopup(null)
      setCrashed('YOU HIT THE SIDE')
      setPhase('fall')
      playWipeoutSound()
    }
    const edgeWipeout = (distance: number) => {
      const fall = falls.get(distance)
      if (fall && envRoot) sideFall(fall, distance)
      else wipeout() // fall clip not downloaded yet: code tumble
    }

    const ray = new THREE.Raycaster()
    const DOWN = new THREE.Vector3(0, -1, 0)
    const rayFrom = new THREE.Vector3()
    let envMaterials: THREE.Material[] = []
    // Snow height under (x, z), searching down from just above `y` so overhead structures don't count.
    // Some surfaces (e.g. the in-run) only face one way, so test both sides while casting.
    const groundY = (x: number, y: number, z: number) => {
      if (!envMaterials.length) {
        const set = new Set<THREE.Material>()
        envRoot!.traverse((o) => {
          if (o instanceof THREE.Mesh) ([] as THREE.Material[]).concat(o.material).forEach((m) => set.add(m))
        })
        envMaterials = [...set]
      }
      const sides = envMaterials.map((m) => m.side)
      envMaterials.forEach((m) => (m.side = THREE.DoubleSide))
      rayFrom.set(x, y + 3, z)
      ray.set(rayFrom, DOWN)
      const hit = ray.intersectObject(envRoot!, true)[0]
      envMaterials.forEach((m, i) => (m.side = sides[i]))
      return hit ? hit.point.y : null
    }

    // Touched down while still leaning: switch to the crash version of this jump (identical up to
    // the landing frame) and let it play out, then back to the gate.
    const fallOnLanding = (fall: GLTF) => {
      game.phase = 'fall'
      game.landed = true
      play(fall, action!.time)
      setTakeoff(null)
      setCrashed('LET GO OF THE ARROWS TO LAND')
      setPhase('fall')
      playWipeoutSound()
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

    const onResize = () => {
      renderer.setSize(mount.clientWidth, mount.clientHeight)
      snow.resize()
    }
    window.addEventListener('resize', onResize)

    const UP = new THREE.Vector3(0, 1, 0)
    const HIP = new THREE.Vector3(0, 0.9, 0) // tumble pivot, in steer space
    const runAxis = new THREE.Vector3(0, 0, 1) // the jump runs along world Z
    const camRight = new THREE.Vector3()
    let screenSign = 1 // world X sign that is "right" on screen for the current camera

    // Wipeout state: velocity before the crash, tumble displacement (world) and spin (steer space).
    const prevPos = new THREE.Vector3()
    let resetVelocity = true
    const snowVel = new THREE.Vector3()
    const camQ = new THREE.Quaternion()
    const velocity = new THREE.Vector3()
    const crashVel = new THREE.Vector3()
    const crashDisp = new THREE.Vector3()
    const crashSlide = new THREE.Vector3()
    const rootInv = new THREE.Quaternion()
    const spinAxis = new THREE.Vector3()
    const spinQ = new THREE.Quaternion()
    const crashQ = new THREE.Quaternion()
    const localDisp = new THREE.Vector3()

    const wipeout = () => {
      game.phase = 'crash'
      game.crashed = true
      game.crashTime = 0
      action!.paused = true
      root!.updateMatrixWorld()
      steer!.parent!.getWorldQuaternion(rootInv).invert()
      crashSlide.copy(steer!.position)
      // Keep the speed we had, and bounce back off the side we hit (toward the middle).
      crashVel.copy(velocity)
      crashVel.x -= Math.sign(game.slide) * screenSign * 3
      crashDisp.set(0, 0, 0)
      crashQ.identity()
      // Forward roll around the sideways axis, plus some cartwheel around the travel direction.
      const travel = crashVel.lengthSq() > 1e-3 ? crashVel.clone().normalize() : runAxis.clone()
      spinAxis.crossVectors(travel, UP).normalize().addScaledVector(travel, 0.6 * Math.sign(game.slide)).normalize()
      spinAxis.applyQuaternion(rootInv)
      setPopup(null)
      setTakeoff(null)
      setCrashed('YOU HIT THE SIDE')
      setPhase('crash')
      playWipeoutSound()
    }

    renderer.setAnimationLoop((time) => {
      timer.update(time)
      const dt = Math.min(timer.getDelta(), 0.1)
      cam?.position.sub(camOffset)
      mixer?.update(dt)
      const push = (game.right ? 1 : 0) - (game.left ? 1 : 0)
      const pos = steer?.parent?.position // trajectory root, world space (top-level node)

      if (game.phase === 'countdown') {
        const before = Math.ceil(COUNTDOWN - game.countdownTime)
        game.countdownTime += dt
        const left = Math.ceil(COUNTDOWN - game.countdownTime)
        if (game.countdownTime >= COUNTDOWN) go()
        else if (left !== before) {
          setCount(String(left))
          playCountdownBeep()
        }
      }

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
        game.slide = game.balance * inrunLimit
        if (hitSide) edgeWipeout(INRUN_CLIP)
        else if (action.time >= TAKEOFF_T) takeOff()
      } else if ((game.phase === 'flight' || game.phase === 'done') && pos) {
        const limit = landingHalfWidth(landingProfile, pos.z) - SKIER_HALF_WIDTH
        game.slide += push * AIR_STEER * dt
        // On the ground (after landing) the edge of the hill is a wipeout; in the air it just stops you.
        const onGround = game.phase === 'done' || game.landed
        if (onGround && Math.abs(game.slide) >= limit) edgeWipeout(game.distance)
        else game.slide = THREE.MathUtils.clamp(game.slide, -limit, limit)
      }

      if (game.phase === 'crash') {
        game.crashTime += dt
        crashVel.multiplyScalar(Math.exp(-1.5 * dt))
        crashDisp.addScaledVector(crashVel, dt)
        spinQ.setFromAxisAngle(spinAxis, TUMBLE_SPIN * Math.exp(-1.2 * game.crashTime) * dt)
        crashQ.premultiply(spinQ)
        if (game.crashTime >= TUMBLE_TIME) getClip(INRUN_CLIP).then((g) => !disposed && toGate(g))
      }

      if (shiftedFall && root && pos) {
        // `pos` is the clip's own (unshifted) skier position; keep the same height above the snow.
        const here = groundY(pos.x, pos.y + root.position.y, pos.z + fallShiftZ.value)
        const there = groundY(pos.x, pos.y, pos.z)
        // Ignore implausible jumps (a missed surface) and keep last frame's height instead.
        if (here !== null && there !== null && Math.abs(here - there - root.position.y) < 4) {
          root.position.set(0, here - there, fallShiftZ.value)
        }
      }

      if (steer && cam && pos) {
        if (game.crashed) {
          // Tumble around the hips, carried down the slope (pose and root are frozen).
          localDisp.copy(crashDisp).applyQuaternion(rootInv)
          steer.quaternion.copy(crashQ)
          steer.position.copy(HIP).applyQuaternion(crashQ).negate().add(HIP).add(crashSlide).add(localDisp)
        } else {
          if (resetVelocity) velocity.set(0, 0, 0)
          else if (dt > 0) velocity.copy(pos).sub(prevPos).divideScalar(dt)
          prevPos.copy(pos)
          resetVelocity = false
          camRight.setFromMatrixColumn(cam.matrixWorld, 0)
          screenSign = Math.sign(camRight.x) || 1
          const steering = game.phase === 'inrun' || game.phase === 'flight' || game.phase === 'done'
          game.lean = THREE.MathUtils.damp(game.lean, steering ? push * LEAN : 0, 8, dt)
          steer.position.set(game.slide * screenSign, 0, 0)
          steer.rotation.set(0, 0, -game.lean * screenSign)
        }
        // The baked camera isn't parented to steer: trail the sideways movement (and the tumble).
        camOffset.set((game.crashed ? crashSlide.x : steer.position.x) * CAM_FOLLOW, 0, 0)
        if (game.crashed) camOffset.addScaledVector(crashDisp, 0.85)
        cam.position.add(camOffset)
      }

      if (game.phase === 'flight' && action && !game.landed) {
        const landAt = landingTimes.get(game.distance)
        if (landAt !== undefined && action.time >= landAt) {
          const fall = falls.get(game.distance)
          if (push !== 0 && fall) fallOnLanding(fall)
          else {
            game.landed = true
            setPopup({ distance: game.distance, id: performance.now() })
            playScoreSound(game.distance)
            playApplause()
          }
        }
      }

      const slope =
        game.phase === 'inrun' ? 'ski'
        : game.phase === 'flight' && !game.landed ? 'air'
        : game.phase === 'flight' && game.landed ? 'ground'
        : 'off'
      syncSlopeSounds(slope)

      // Snow streams opposite to the skier's motion as seen by the camera (which follows them).
      if (cam) {
        snowVel.copy(game.crashed ? crashVel : velocity).applyQuaternion(cam.getWorldQuaternion(camQ).invert())
        snow.update(dt, snowVel)
      }

      if ((game.phase === 'ready' || game.phase === 'countdown') && hasOverview) {
        // Wait on the whole-hill overview; during the countdown hold, then ease down to the gate camera.
        const t = game.phase === 'ready' ? 0 : THREE.MathUtils.smootherstep(game.countdownTime, PAN_START, PAN_END)
        introCam.position.lerpVectors(introFrom.pos, introTo.pos, t)
        introCam.quaternion.slerpQuaternions(introFrom.quat, introTo.quat, t)
        introCam.fov = THREE.MathUtils.lerp(introFrom.fov, introTo.fov, t)
        introCam.aspect = mount.clientWidth / mount.clientHeight
        introCam.updateProjectionMatrix()
        renderer.render(scene, introCam)
      } else if (cam) {
        cam.aspect = mount.clientWidth / mount.clientHeight
        cam.updateProjectionMatrix()
        renderer.render(scene, cam)
      }
    })

    return () => {
      disposed = true
      syncSlopeSounds('off')
      stopCrowdSounds()
      renderer.setAnimationLoop(null)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('resize', onResize)
      renderer.dispose()
      snow.dispose()
      mount.removeChild(renderer.domElement)
    }
  }, [])

  return (
    <div className="ski-jump">
      <div ref={mountRef} className="ski-jump__canvas" />

      {phase === 'loading' && <div className="ski-jump__banner">LOADING…</div>}

      {count && (phase === 'countdown' || (phase === 'inrun' && count === 'GO!')) && (
        <div key={count} className={`ski-jump__count${count === 'GO!' ? ' ski-jump__count--go' : ''}`}>
          {count}
        </div>
      )}

      {crashed && (
        <div className="ski-jump__takeoff">
          <div className="ski-jump__takeoff-label">WIPEOUT!</div>
          <div className="ski-jump__help">{crashed}</div>
        </div>
      )}

      {(phase === 'ready' || (phase === 'done' && !onFinish)) && (
        <div className="ski-jump__banner ski-jump__banner--bottom">
          <div className="ski-jump__blink">PRESS ↑ TO {phase === 'done' ? 'JUMP AGAIN' : 'JUMP'}</div>
          <div className="ski-jump__help">&lt; &gt; BALANCE &nbsp;&nbsp; ↑ TAKE OFF AT THE LIP &nbsp;&nbsp; LET GO TO LAND</div>
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
