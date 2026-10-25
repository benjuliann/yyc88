import { useCallback, useEffect, useState } from "react";
import { sendInput, watchState, type RunState } from "../lib/input";
import { getPlayerId } from "../lib/room";
import RotatePhone from "./RotatePhone";
import "../styles/ski-jump.css";

const DEADZONE = 5; // degrees of tilt ignored around level
const FULL_TILT = 45; // degrees of tilt for full left/right
const JUMP_ACCEL = 4; // m/s² above gravity that counts as raising the phone
const JUMP_COOLDOWN = 600; // ms

// iOS only fires motion events after the page asks from a tap.
type PermissionEvent = { requestPermission?: () => Promise<string> };

// Held sideways like a steering wheel: press Start on your turn, turn it left/right to steer, lift the phone to jump.
export default function TiltPad({ room }: { room: string }) {
  const [enabled, setEnabled] = useState(false);
  const [error, setError] = useState("");
  const [run, setRun] = useState<RunState | null>(null);
  const [jumping, setJumping] = useState(false);

  useEffect(() => watchState(room, setRun), [room]);

  const send = useCallback(
    (key: string, tilt?: number) => {
      sendInput(room, getPlayerId(), key, tilt).catch(console.error);
    },
    [room],
  );

  useEffect(() => {
    if (!enabled) return;
    let lastTilt = 0;
    let lastJump = 0;

    const steer = (x: number, y: number) => {
      // Sideways, gravity runs along the phone's short edge (x); turning the phone swings it toward
      // the long edge (y). Multiplying by sign(x) makes this read the same in both landscape directions.
      const degrees = (Math.atan2(y * Math.sign(x), Math.abs(x)) * 180) / Math.PI;
      const amount = Math.min(1, Math.max(0, Math.abs(degrees) - DEADZONE) / (FULL_TILT - DEADZONE));
      const next = Math.round(Math.sign(degrees) * amount * 10) / 10; // steps of 0.1 to limit sends
      if (next === lastTilt) return;
      lastTilt = next;
      send("tilt", next);
    };

    const onMotion = (e: DeviceMotionEvent) => {
      const a = e.accelerationIncludingGravity;
      if (!a) return;
      // Upright the readings are meaningless for steering, and the rotate prompt is showing anyway.
      if (window.matchMedia("(orientation: landscape)").matches) steer(a.x ?? 0, a.y ?? 0);

      // Raising the phone fast pushes the felt acceleration above gravity, whatever way it's held.
      const extra = Math.hypot(a.x ?? 0, a.y ?? 0, a.z ?? 0) - 9.81;
      const now = Date.now();
      if (extra < JUMP_ACCEL || now - lastJump < JUMP_COOLDOWN) return;
      lastJump = now;
      send("jump");
      setJumping(true);
      setTimeout(() => setJumping(false), 300);
    };

    window.addEventListener("devicemotion", onMotion);
    return () => window.removeEventListener("devicemotion", onMotion);
  }, [enabled, send]);

  // The motion permission has to be asked from this tap, so the first Start also turns the sensors on.
  const start = async () => {
    if (!enabled) {
      try {
        // Browsers hide the motion API entirely on non-HTTPS pages.
        if (typeof DeviceMotionEvent === "undefined") {
          setError("Motion sensors need a secure (https) page. Open this site over https.");
          return;
        }
        const motion = DeviceMotionEvent as unknown as PermissionEvent;
        if (motion.requestPermission && (await motion.requestPermission()) !== "granted") {
          setError("Motion access is needed to play. Close this tab and reopen the page to be asked again.");
          return;
        }
        setEnabled(true);
      } catch (err) {
        console.error(err);
        setError(`Couldn't read motion sensors: ${err instanceof Error ? err.message : err}`);
        return;
      }
    }
    send("start");
  };

  // The big screen only listens to the racer whose turn it is, and only until they leave the ground.
  const myTurn = run?.turn === getPlayerId();
  const atGate = myTurn && run?.phase === "ready";
  const inrun = myTurn && run?.phase === "inrun";
  const hint = !myTurn
    ? "Wait for your turn"
    : atGate
      ? "Your turn! Hold your phone sideways and press Start"
      : run?.phase === "countdown"
        ? "Get ready…"
        : inrun
          ? jumping
            ? "Jump!"
            : "Turn to balance, lift to take off"
          : run?.phase === "flight"
            ? "In the air, controls off"
            : "Controls off";

  return (
    <div className="controller__form">
      <RotatePhone to="landscape" />
      <p className="controller__message">{hint}</p>
      {error && <p className="controller__error">{error}</p>}

      {/* The same meters as the big screen, dimmed while the controls are off. */}
      <div className="ski-jump__hud ski-jump__hud--phone" style={{ opacity: inrun ? 1 : 0.4 }}>
        <div className="ski-jump__meter-label">BALANCE</div>
        <div className="ski-jump__meter">
          <div className="ski-jump__meter-zone" />
          <div
            className="ski-jump__needle"
            style={{ left: `${50 + (inrun ? run.balance : 0) * 50}%`, transition: "left 0.1s linear" }}
          />
        </div>
        <div className="ski-jump__meter-label">TAKE-OFF ↑</div>
        <div className="ski-jump__lip">
          <div className="ski-jump__lip-fill" style={{ width: `${(inrun ? run.lip : 0) * 100}%`, transition: "width 0.1s linear" }} />
        </div>
      </div>

      <button className="join-race join-race--solid" disabled={!atGate} onClick={start}>
        Start
      </button>
    </div>
  );
}
