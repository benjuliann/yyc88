import { useParams } from "react-router-dom";
import { useEffect, useCallback, useState } from "react";

type Key = "ArrowUp" | "ArrowDown" | "ArrowLeft" | "ArrowRight";

const KEYS: Record<Key, { symbol: string; color: string }> = {
  ArrowUp: { symbol: "↑", color: "#e21b3c" }, // red
  ArrowLeft: { symbol: "←", color: "#1368ce" }, // blue
  ArrowDown: { symbol: "↓", color: "#d89e00" }, // yellow
  ArrowRight: { symbol: "→", color: "#26890c" }, // green
};

const isArrowKey = (k: string): k is Key => k in KEYS;

export default function Controller() {
  const { room } = useParams();
  const [pressed, setPressed] = useState<Partial<Record<Key, boolean>>>({});

  // Replace the body of this with your send logic
  const send = useCallback(
    (input: string) => {
      console.log(`room ${room}: ${input}`);
    },
    [room],
  );

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!isArrowKey(e.key)) return;
      e.preventDefault(); // stop the page from scrolling
      setPressed((p) => ({ ...p, [e.key]: true }));
      send(e.key);
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (isArrowKey(e.key)) setPressed((p) => ({ ...p, [e.key]: false }));
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [send]);

  const arrowButton = (key: Key) => (
    <button
      aria-label={key}
      onPointerDown={() => {
        setPressed((p) => ({ ...p, [key]: true }));
        send(key);
      }}
      onPointerUp={() => setPressed((p) => ({ ...p, [key]: false }))}
      onPointerLeave={() => setPressed((p) => ({ ...p, [key]: false }))}
      style={{
        width: 90,
        height: 90,
        fontSize: 36,
        color: "white",
        background: KEYS[key].color,
        border: "none",
        borderRadius: 8,
        cursor: "pointer",
        touchAction: "none",
        filter: pressed[key] ? "brightness(0.7)" : "none",
        transform: pressed[key] ? "scale(0.95)" : "none",
      }}
    >
      {KEYS[key].symbol}
    </button>
  );

  return (
    <div style={{ textAlign: "center" }}>
      <h1>Controller - room {room}</h1>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 90px)",
          gap: 8,
          justifyContent: "center",
        }}
      >
        <div />
        {arrowButton("ArrowUp")}
        <div />
        {arrowButton("ArrowLeft")}
        {arrowButton("ArrowDown")}
        {arrowButton("ArrowRight")}
      </div>

      <button
        style={{ marginTop: 24 }}
        onClick={(e) => {
          send("restart");
          e.currentTarget.blur(); // keep Space/Enter from re-triggering it
        }}
      >
        Restart
      </button>
    </div>
  );
}
