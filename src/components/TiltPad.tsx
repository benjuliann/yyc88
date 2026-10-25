import { useCallback, useEffect, useState } from "react";
import { sendInput } from "../lib/input";
import { getPlayerId } from "../lib/room";
import RotatePhone from "./RotatePhone";

const DEADZONE = 5; // degrees of tilt ignored around level
const FULL_TILT = 45; // degrees of tilt for full left/right
const JUMP_ACCEL = 4; // m/s² above gravity that counts as raising the phone
const JUMP_COOLDOWN = 600; // ms

// iOS only fires motion events after the page asks from a tap.
type PermissionEvent = { requestPermission?: () => Promise<string> };

// Held sideways like a steering wheel: turn it left/right to steer, lift the phone to jump.
export default function TiltPad({ room }: { room: string }) {
  const [enabled, setEnabled] = useState(false);
  const [error, setError] = useState("");
  const [tilt, setTilt] = useState(0);
  const [jumping, setJumping] = useState(false);

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
      setTilt(next);
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

  const start = async () => {
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
    }
  };

  if (!enabled) {
    return (
      <div className="controller__form">
        <RotatePhone to="landscape" />
        <p className="controller__message">Hold your phone sideways. Turn it to steer, lift it to jump.</p>
        {error && <p className="controller__error">{error}</p>}
        <button className="join-race join-race--solid" onClick={start}>
          Start
        </button>
      </div>
    );
  }

  return (
    <div className="controller__form">
      <RotatePhone to="landscape" />
      <p className="controller__message">{jumping ? "Jump!" : "Turn to steer, lift to jump"}</p>

      {/* Tilt meter: the marker slides from left edge (-1) to right edge (1). */}
      <div style={{ position: "relative", width: 240, height: 24, borderRadius: 12, background: "#ddd" }}>
        <div
          style={{
            position: "absolute",
            top: 0,
            left: `${((tilt + 1) / 2) * 100}%`,
            width: 24,
            height: 24,
            marginLeft: -12,
            borderRadius: 12,
            background: jumping ? "#e21b3c" : "#1368ce",
          }}
        />
      </div>

      <button
        className="join-race join-race--outline"
        onClick={(e) => {
          send("restart");
          e.currentTarget.blur();
        }}
      >
        Restart
      </button>
    </div>
  );
}
