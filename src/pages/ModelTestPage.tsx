import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import ScorePopup from '../components/ScorePopup'
import { playScoreSound } from '../lib/scoreSounds'
import { MODELS as BASE, DISTANCES, clipFile, fixBlenderLights, type Manifest } from '../lib/skiModels'


// Test viewer for the Blender exports: shared environment + one jump clip at a time.
export default function ModelTestPage() {
  const mountRef = useRef<HTMLDivElement>(null)
  const loadClipRef = useRef<(m: number) => void>(() => {})
  const useTrackingRef = useRef(true)
  const [distance, setDistance] = useState(100)
  const [useTracking, setUseTracking] = useState(true)
  const [envStatus, setEnvStatus] = useState('Loading environment…')
  const [status, setStatus] = useState('')
  // Bumps on every landing so the popup remounts and replays its animation.
  const [popup, setPopup] = useState<{ distance: number; id: number } | null>(null)

  useEffect(() => {
    const mount = mountRef.current!
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.setSize(mount.clientWidth, mount.clientHeight)
    mount.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    // GLB doesn't carry Blender's world sky, so add sky colour + ambient light here.
    scene.background = new THREE.Color(0xbfd8f0)
    scene.add(new THREE.HemisphereLight(0xffffff, 0x8a8a7a, 1))

    const orbitCam = new THREE.PerspectiveCamera(50, mount.clientWidth / mount.clientHeight, 0.5, 120000)
    orbitCam.position.set(300, 200, 300)
    const controls = new OrbitControls(orbitCam, renderer.domElement)

    const loader = new GLTFLoader()
    const timer = new THREE.Timer()
    let mixer: THREE.AnimationMixer | null = null
    let clipRoot: THREE.Object3D | null = null
    let trackingCam: THREE.PerspectiveCamera | null = null
    let disposed = false

    // Landing time (s) per distance, from the Blender scenes' LANDING markers.
    const landingTimes = new Map<number, number>()
    fetch(`${BASE}/manifest.json`)
      .then((r) => r.json())
      .then((m: Manifest) => {
        for (const c of m.clips) landingTimes.set(c.distance_m, c.landing_frame / c.fps)
      })
    let action: THREE.AnimationAction | null = null
    let clipDistance = 0
    let lastTime = 0
    let landed = false

    loader.load(
      `${BASE}/calgary-1988-sports-environment.glb`,
      (gltf) => {
        if (disposed) return
        fixBlenderLights(gltf.scene)
        scene.add(gltf.scene)
        // Start the orbit camera at the environment's "Entire ski hill overview" camera.
        const overview = gltf.cameras[0]
        if (overview) {
          scene.updateMatrixWorld()
          overview.getWorldPosition(orbitCam.position)
          const dir = overview.getWorldDirection(new THREE.Vector3())
          controls.target.copy(orbitCam.position).addScaledVector(dir, 400)
          controls.update()
        }
        setEnvStatus('')
      },
      (e) => e.total && setEnvStatus(`Loading environment… ${Math.round((e.loaded / e.total) * 100)}%`),
      (err) => setEnvStatus(`Environment failed: ${String(err)}`),
    )

    loadClipRef.current = (m: number) => {
      setStatus(`Loading Jump_${m}m…`)
      loader.load(
        clipFile(m),
        (gltf) => {
          if (disposed) return
          if (clipRoot) scene.remove(clipRoot)
          mixer?.stopAllAction()
          clipRoot = gltf.scene
          scene.add(clipRoot)
          trackingCam = (gltf.cameras[0] as THREE.PerspectiveCamera) ?? null
          mixer = new THREE.AnimationMixer(clipRoot)
          gltf.animations.forEach((clip) => mixer!.clipAction(clip).play())
          action = mixer.clipAction(gltf.animations[0])
          clipDistance = m
          lastTime = 0
          landed = false
          setPopup(null)
          setStatus(`Playing Jump_${m}m (${gltf.animations.length} clip, ${trackingCam ? 'tracking camera' : 'no camera'})`)
        },
        undefined,
        (err) => setStatus(`Jump_${m}m failed: ${String(err)}`),
      )
    }
    loadClipRef.current(100)

    const onResize = () => {
      const w = mount.clientWidth
      const h = mount.clientHeight
      renderer.setSize(w, h)
      for (const cam of [orbitCam, trackingCam]) {
        if (!cam) continue
        cam.aspect = w / h
        cam.updateProjectionMatrix()
      }
    }
    window.addEventListener('resize', onResize)

    renderer.setAnimationLoop((time) => {
      timer.update(time)
      mixer?.update(timer.getDelta())
      if (action) {
        const t = action.time
        const landAt = landingTimes.get(clipDistance)
        if (t < lastTime) {
          // Clip looped back to the start: clear the score for the next run.
          landed = false
          setPopup(null)
        } else if (!landed && landAt !== undefined && t >= landAt) {
          landed = true
          setPopup({ distance: clipDistance, id: performance.now() })
          playScoreSound(clipDistance)
        }
        lastTime = t
      }
      const cam = useTrackingRef.current && trackingCam ? trackingCam : orbitCam
      if (cam === trackingCam) {
        cam.aspect = mount.clientWidth / mount.clientHeight
        cam.updateProjectionMatrix()
      }
      controls.enabled = cam === orbitCam
      renderer.render(scene, cam)
    })

    return () => {
      disposed = true
      renderer.setAnimationLoop(null)
      window.removeEventListener('resize', onResize)
      controls.dispose()
      renderer.dispose()
      mount.removeChild(renderer.domElement)
    }
  }, [])

  return (
    <div style={{ position: 'fixed', inset: 0 }}>
      <div ref={mountRef} style={{ width: '100%', height: '100%' }} />
      {popup && <ScorePopup key={popup.id} distance={popup.distance} />}
      <div
        style={{
          position: 'absolute', top: 12, left: 12, padding: '8px 12px', borderRadius: 8,
          background: 'rgba(0,0,0,0.6)', color: '#fff', font: '14px system-ui', display: 'flex', gap: 12, alignItems: 'center',
        }}
      >
        <label>
          Jump{' '}
          <select
            value={distance}
            onChange={(e) => {
              const m = Number(e.target.value)
              setDistance(m)
              loadClipRef.current(m)
            }}
          >
            {DISTANCES.map((m) => (
              <option key={m} value={m}>{m} m</option>
            ))}
          </select>
        </label>
        <label>
          <input
            type="checkbox"
            checked={useTracking}
            onChange={(e) => {
              setUseTracking(e.target.checked)
              useTrackingRef.current = e.target.checked
            }}
          />{' '}
          Tracking camera
        </label>
        <span style={{ opacity: 0.8 }}>{envStatus || status}</span>
      </div>
    </div>
  )
}
