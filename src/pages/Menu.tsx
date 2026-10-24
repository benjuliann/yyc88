import { useState, useEffect, useMemo } from "react";
import "./Menu.css";

// ---------- types ----------
type Gear = "skis" | "snowboard" | "bobsled";
type HatStyle = "none" | "beanie" | "cap" | "helmet";
type PomSize = "small" | "medium" | "large";
type HairStyle = "none" | "short" | "ponytail" | "curly" | "long";
type Eyes = "dots" | "happy" | "wide";
type Mouth = "smile" | "grin" | "flat";
type Beard = "none" | "short" | "full";
type Pattern = "none" | "stripes" | "checks" | "snowflake";

export type SkierConfig = {
  name: string;
  gear: Gear;
  gearColor: string;
  hatStyle: HatStyle;
  hatColor: string;
  pomSize: PomSize;
  scarfColor: string | null;
  gogglesColor: string | null;
  shadesColor: string | null;
  mittenColor: string | null;
  shirtColor: string;
  pantsColor: string;
  bootColor: string;
  skin: string;
  hairStyle: HairStyle;
  hairColor: string;
  eyes: Eyes;
  mouth: Mouth;
  beard: Beard;
  pattern: Pattern;
  patternColor: string;
  earColor: string | null;
  maskColor: string | null;
  packColor: string | null;
};

type Swatch = { label: string; value: string };

// ---------- data ----------
const COLORS: Swatch[] = [
  { label: "Red", value: "#e21b3c" },
  { label: "Blue", value: "#1368ce" },
  { label: "Yellow", value: "#f5c400" },
  { label: "Green", value: "#26890c" },
  { label: "Orange", value: "#f57c00" },
  { label: "Purple", value: "#7b3fbf" },
  { label: "Black", value: "#222222" },
  { label: "White", value: "#f5f5f5" },
];

const HAIRS: Swatch[] = [
  { label: "Black", value: "#1c1c1c" },
  { label: "Brown", value: "#6b4423" },
  { label: "Blonde", value: "#e6c35c" },
  { label: "Red", value: "#b5451b" },
  { label: "Gray", value: "#9aa3ab" },
  { label: "Pink", value: "#e86aa6" },
];

const SKINS: Swatch[] = [
  { label: "Light", value: "#ffdbac" },
  { label: "Fair", value: "#f1c27d" },
  { label: "Tan", value: "#e0ac69" },
  { label: "Brown", value: "#c68642" },
  { label: "Deep", value: "#8d5524" },
];

const STORAGE_KEY = "skierConfig";

const DEFAULT_CONFIG: SkierConfig = {
  name: "",
  gear: "skis",
  gearColor: "#c62828",
  hatStyle: "beanie",
  hatColor: "#e21b3c",
  pomSize: "medium",
  scarfColor: "#1368ce",
  gogglesColor: null,
  shadesColor: null,
  mittenColor: "#f5c400",
  shirtColor: "#26890c",
  pantsColor: "#222222",
  bootColor: "#333333",
  skin: "#f1c27d",
  hairStyle: "short",
  hairColor: "#6b4423",
  eyes: "dots",
  mouth: "smile",
  beard: "none",
  pattern: "none",
  patternColor: "#f5f5f5",
  earColor: null,
  maskColor: null,
  packColor: null,
};

export function loadSkier(): SkierConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...DEFAULT_CONFIG, ...JSON.parse(raw) } : DEFAULT_CONFIG;
  } catch {
    return DEFAULT_CONFIG;
  }
}

// ---------- randomizers ----------
const pick = <T,>(arr: readonly T[]): T =>
  arr[Math.floor(Math.random() * arr.length)];
const randColor = () => pick(COLORS).value;
const maybeColor = (chance: number) =>
  Math.random() < chance ? randColor() : null;

const ADJECTIVES = [
  "Frosty",
  "Snowy",
  "Icy",
  "Swift",
  "Chilly",
  "Fluffy",
  "Bold",
  "Lucky",
];
const ANIMALS = [
  "Fox",
  "Yeti",
  "Otter",
  "Penguin",
  "Moose",
  "Wolf",
  "Owl",
  "Bear",
];
const randomName = () => `${pick(ADJECTIVES)} ${pick(ANIMALS)}`;

const randomOutfit = (): Omit<SkierConfig, "name"> => ({
  gear: pick<Gear>(["skis", "snowboard", "bobsled"]),
  gearColor: randColor(),
  hatStyle: pick<HatStyle>(["none", "beanie", "cap", "helmet"]),
  hatColor: randColor(),
  pomSize: pick<PomSize>(["small", "medium", "large"]),
  scarfColor: maybeColor(0.7),
  gogglesColor: maybeColor(0.4),
  shadesColor: maybeColor(0.25),
  mittenColor: maybeColor(0.8),
  shirtColor: randColor(),
  pantsColor: randColor(),
  bootColor: randColor(),
  skin: pick(SKINS).value,
  hairStyle: pick<HairStyle>(["none", "short", "ponytail", "curly", "long"]),
  hairColor: pick(HAIRS).value,
  eyes: pick<Eyes>(["dots", "happy", "wide"]),
  mouth: pick<Mouth>(["smile", "grin", "flat"]),
  beard: pick<Beard>(["none", "none", "short", "full"]),
  pattern: pick<Pattern>(["none", "stripes", "checks", "snowflake"]),
  patternColor: randColor(),
  earColor: maybeColor(0.25),
  maskColor: maybeColor(0.15),
  packColor: maybeColor(0.3),
});

// ---------- avatar ----------
const POM_RADIUS: Record<PomSize, number> = { small: 4, medium: 6, large: 9 };
const HAIR_CUT = "M78 60 a22 22 0 0 1 44 0 q-6 -9 -22 -9 q-16 0 -22 9z";

function SkierPreview({ c }: { c: SkierConfig }) {
  const hair = c.hairColor;
  const pom = POM_RADIUS[c.pomSize];

  const stripes = Array.from({ length: 5 }, (_, i) => (
    <rect
      key={i}
      x="76"
      y={94 + i * 13}
      width="48"
      height="6"
      fill={c.patternColor}
    />
  ));

  const checks: JSX.Element[] = [];
  for (let i = 0; i < 6; i++) {
    for (let j = 0; j < 8; j++) {
      if ((i + j) % 2 === 0) {
        checks.push(
          <rect
            key={`${i}-${j}`}
            x={76 + j * 6}
            y={88 + i * 11}
            width="6"
            height="11"
            fill={c.patternColor}
          />,
        );
      }
    }
  }

  return (
    <svg
      viewBox="0 0 200 250"
      width="200"
      height="250"
      role="img"
      aria-label="Skier preview"
    >
      <defs>
        <clipPath id="torso">
          <rect x="76" y="88" width="48" height="66" rx="10" />
        </clipPath>
      </defs>

      {/* skis (with poles) and snowboard; the bobsled is drawn later, over the legs */}
      {c.gear === "skis" && (
        <>
          <rect
            x="62"
            y="213"
            width="36"
            height="4"
            rx="2"
            fill={c.gearColor}
          />
          <rect
            x="102"
            y="213"
            width="36"
            height="4"
            rx="2"
            fill={c.gearColor}
          />
          <line
            x1="69"
            y1="140"
            x2="46"
            y2="218"
            stroke="#555"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <line
            x1="131"
            y1="140"
            x2="154"
            y2="218"
            stroke="#555"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <ellipse cx="48.5" cy="210" rx="6" ry="2.5" fill="#555" />
          <ellipse cx="151.5" cy="210" rx="6" ry="2.5" fill="#555" />
        </>
      )}
      {c.gear === "snowboard" && (
        <rect x="52" y="212" width="96" height="9" rx="4" fill={c.gearColor} />
      )}

      {/* everything below gently breathes */}
      <g className="breathe">
        {/* hair behind the body */}
        {c.hairStyle === "long" && (
          <rect x="74" y="42" width="52" height="62" rx="22" fill={hair} />
        )}
        {c.hairStyle === "ponytail" && (
          <>
            <ellipse cx="128" cy="80" rx="6" ry="15" fill={hair} />
            <circle cx="123" cy="64" r="3.5" fill="#e21b3c" />
          </>
        )}

        {/* backpack peeks out behind the shoulders */}
        {c.packColor && (
          <rect
            x="72"
            y="80"
            width="56"
            height="60"
            rx="12"
            fill={c.packColor}
          />
        )}

        {/* legs and boots */}
        <rect
          x="80"
          y="150"
          width="19"
          height="58"
          rx="6"
          fill={c.pantsColor}
        />
        <rect
          x="101"
          y="150"
          width="19"
          height="58"
          rx="6"
          fill={c.pantsColor}
        />
        <rect x="78" y="204" width="23" height="9" rx="3" fill={c.bootColor} />
        <rect x="99" y="204" width="23" height="9" rx="3" fill={c.bootColor} />

        {/* arms and torso */}
        <rect x="62" y="94" width="14" height="48" rx="7" fill={c.shirtColor} />
        <rect
          x="124"
          y="94"
          width="14"
          height="48"
          rx="7"
          fill={c.shirtColor}
        />
        <rect
          x="76"
          y="88"
          width="48"
          height="66"
          rx="10"
          fill={c.shirtColor}
        />

        {/* jacket pattern, clipped to the torso */}
        {c.pattern !== "none" && (
          <g clipPath="url(#torso)">
            {c.pattern === "stripes" && stripes}
            {c.pattern === "checks" && checks}
            {c.pattern === "snowflake" && (
              <g
                transform="translate(100 121)"
                stroke={c.patternColor}
                strokeWidth="2.5"
                strokeLinecap="round"
              >
                <line x1="-13" y1="0" x2="13" y2="0" />
                <line x1="-13" y1="0" x2="13" y2="0" transform="rotate(60)" />
                <line x1="-13" y1="0" x2="13" y2="0" transform="rotate(120)" />
                <circle
                  cx="0"
                  cy="0"
                  r="3"
                  fill={c.patternColor}
                  stroke="none"
                />
              </g>
            )}
          </g>
        )}

        {/* backpack straps */}
        {c.packColor && (
          <>
            <rect
              x="84"
              y="90"
              width="5"
              height="30"
              rx="2"
              fill="#000"
              opacity="0.25"
            />
            <rect
              x="111"
              y="90"
              width="5"
              height="30"
              rx="2"
              fill="#000"
              opacity="0.25"
            />
          </>
        )}

        {/* mittens */}
        {c.mittenColor && (
          <>
            <circle cx="69" cy="146" r="8" fill={c.mittenColor} />
            <circle cx="131" cy="146" r="8" fill={c.mittenColor} />
          </>
        )}

        {/* bobsled covers the legs so the skier looks seated inside */}
        {c.gear === "bobsled" && (
          <>
            <path
              d="M34 162 Q34 156 42 156 L158 156 Q172 162 166 190 Q160 214 140 214 L60 214 Q36 214 34 190 Z"
              fill={c.gearColor}
            />
            <rect x="37" y="176" width="126" height="5" rx="2" fill="#f5f5f5" />
            <rect x="46" y="219" width="108" height="4" rx="2" fill="#888" />
            <rect x="64" y="212" width="5" height="8" rx="1" fill="#888" />
            <rect x="131" y="212" width="5" height="8" rx="1" fill="#888" />
          </>
        )}

        {/* head */}
        <circle cx="100" cy="60" r="22" fill={c.skin} />

        {/* beard */}
        {c.beard !== "none" && (
          <path
            d={
              c.beard === "short"
                ? "M80 66 q0 22 20 22 q20 0 20 -22 q-6 14 -20 14 q-14 0 -20 -14z"
                : "M78 62 q0 30 22 30 q22 0 22 -30 q-6 16 -22 16 q-16 0 -22 -16z"
            }
            fill={hair}
          />
        )}

        {/* mouth */}
        {c.mouth === "smile" && (
          <path
            d="M93 71 q7 7 14 0"
            fill="none"
            stroke="#5a2d1d"
            strokeWidth="2"
            strokeLinecap="round"
          />
        )}
        {c.mouth === "grin" && (
          <path d="M92 70 h16 q-2 9 -8 9 q-6 0 -8 -9z" fill="#7a2a2a" />
        )}
        {c.mouth === "flat" && (
          <line
            x1="94"
            y1="73"
            x2="106"
            y2="73"
            stroke="#5a2d1d"
            strokeWidth="2"
            strokeLinecap="round"
          />
        )}

        {/* eyes (they blink) */}
        <g className="eye">
          {c.eyes === "dots" && (
            <>
              <circle cx="93" cy="60" r="2.5" fill="#222" />
              <circle cx="107" cy="60" r="2.5" fill="#222" />
            </>
          )}
          {c.eyes === "happy" && (
            <>
              <path
                d="M89 61 q4 -5 8 0"
                fill="none"
                stroke="#222"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <path
                d="M103 61 q4 -5 8 0"
                fill="none"
                stroke="#222"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </>
          )}
          {c.eyes === "wide" && (
            <>
              <circle cx="93" cy="60" r="4.2" fill="#fff" />
              <circle cx="107" cy="60" r="4.2" fill="#fff" />
              <circle cx="93" cy="60" r="2" fill="#222" />
              <circle cx="107" cy="60" r="2" fill="#222" />
            </>
          )}
        </g>

        {/* face mask */}
        {c.maskColor && (
          <rect
            x="82"
            y="64"
            width="36"
            height="16"
            rx="6"
            fill={c.maskColor}
          />
        )}

        {/* sunglasses */}
        {c.shadesColor && (
          <>
            <rect
              x="81"
              y="55"
              width="17"
              height="11"
              rx="4"
              fill={c.shadesColor}
            />
            <rect
              x="102"
              y="55"
              width="17"
              height="11"
              rx="4"
              fill={c.shadesColor}
            />
            <line
              x1="98"
              y1="59"
              x2="102"
              y2="59"
              stroke="#111"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </>
        )}

        {/* goggles */}
        {c.gogglesColor && (
          <>
            <rect x="77" y="58" width="46" height="5" rx="2" fill="#222" />
            <rect
              x="81"
              y="54"
              width="17"
              height="13"
              rx="5"
              fill={c.gogglesColor}
              stroke="#222"
              strokeWidth="2"
            />
            <rect
              x="102"
              y="54"
              width="17"
              height="13"
              rx="5"
              fill={c.gogglesColor}
              stroke="#222"
              strokeWidth="2"
            />
          </>
        )}

        {/* scarf (the tail sways) */}
        {c.scarfColor && (
          <>
            <rect
              x="80"
              y="80"
              width="40"
              height="11"
              rx="5"
              fill={c.scarfColor}
            />
            <g className="sway">
              <rect
                x="108"
                y="88"
                width="12"
                height="30"
                rx="5"
                fill={c.scarfColor}
              />
            </g>
          </>
        )}

        {/* hair on top of the head (peeks out below the hat) */}
        {(c.hairStyle === "short" || c.hairStyle === "ponytail") && (
          <path d={HAIR_CUT} fill={hair} />
        )}
        {c.hairStyle === "long" && (
          <>
            <path d={HAIR_CUT} fill={hair} />
            <rect x="75" y="50" width="7" height="48" rx="3" fill={hair} />
            <rect x="118" y="50" width="7" height="48" rx="3" fill={hair} />
          </>
        )}
        {c.hairStyle === "curly" && (
          <>
            <circle cx="79" cy="62" r="7" fill={hair} />
            <circle cx="121" cy="62" r="7" fill={hair} />
            <circle cx="86" cy="44" r="7" fill={hair} />
            <circle cx="100" cy="40" r="8" fill={hair} />
            <circle cx="114" cy="44" r="7" fill={hair} />
            <circle cx="79" cy="48" r="6" fill={hair} />
            <circle cx="121" cy="48" r="6" fill={hair} />
          </>
        )}

        {/* ear muffs */}
        {c.earColor && (
          <>
            <path
              d="M76 58 a24 24 0 0 1 48 0"
              fill="none"
              stroke="#444"
              strokeWidth="3"
            />
            <circle cx="77" cy="62" r="7" fill={c.earColor} />
            <circle cx="123" cy="62" r="7" fill={c.earColor} />
          </>
        )}

        {/* hat */}
        {c.hatStyle !== "none" && (
          <>
            <path d="M77 54 a23 23 0 0 1 46 0 z" fill={c.hatColor} />
            {c.hatStyle === "beanie" && (
              <>
                <rect
                  x="77"
                  y="50"
                  width="46"
                  height="7"
                  rx="3"
                  fill={c.hatColor}
                />
                <circle
                  cx="100"
                  cy={33 - pom * 0.4}
                  r={pom}
                  fill={c.hatColor}
                />
              </>
            )}
            {c.hatStyle === "cap" && (
              <rect
                x="98"
                y="50"
                width="34"
                height="6"
                rx="3"
                fill={c.hatColor}
              />
            )}
            {c.hatStyle === "helmet" && (
              <rect
                x="80"
                y="52"
                width="40"
                height="9"
                rx="4"
                fill="#222"
                opacity="0.8"
              />
            )}
          </>
        )}
      </g>
    </svg>
  );
}

// ---------- falling snow ----------
function Snow() {
  const flakes = useMemo(
    () =>
      Array.from({ length: 28 }, (_, i) => ({
        i,
        left: Math.random() * 100,
        size: 2 + Math.random() * 3,
        duration: 10 + Math.random() * 10,
        delay: -Math.random() * 20,
        dx: `${Math.random() * 60 - 30}px`,
      })),
    [],
  );

  return (
    <div className="snow" aria-hidden="true">
      {flakes.map((f) => (
        <i
          key={f.i}
          style={
            {
              left: `${f.left}%`,
              width: f.size,
              height: f.size,
              animationDuration: `${f.duration}s`,
              animationDelay: `${f.delay}s`,
              "--dx": f.dx,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}

// ---------- small UI pieces ----------
const swatchStyle: React.CSSProperties = {
  width: 34,
  height: 34,
  borderRadius: "50%",
  border: "1px solid #999",
  cursor: "pointer",
  outlineOffset: 2,
};

const pillStyle: React.CSSProperties = {
  padding: "8px 14px",
  borderRadius: 8,
  border: "1px solid #bbb",
  cursor: "pointer",
  background: "#fff",
  color: "#222",
};

function ColorPicker({
  label,
  value,
  onChange,
  allowNone = false,
  options = COLORS,
}: {
  label: string;
  value: string | null;
  onChange: (v: string | null) => void;
  allowNone?: boolean;
  options?: Swatch[];
}) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ marginBottom: 6, fontWeight: 600 }}>{label}</div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {allowNone && (
          <button
            aria-label={`${label}: none`}
            aria-pressed={value === null}
            onClick={() => onChange(null)}
            style={{
              ...swatchStyle,
              background: "#fff",
              outline: value === null ? "3px solid #1368ce" : "none",
            }}
          >
            ✕
          </button>
        )}
        {options.map((col) => (
          <button
            key={col.value}
            aria-label={`${label}: ${col.label}`}
            aria-pressed={value === col.value}
            onClick={() => onChange(col.value)}
            style={{
              ...swatchStyle,
              background: col.value,
              outline: value === col.value ? "3px solid #1368ce" : "none",
            }}
          />
        ))}
      </div>
    </div>
  );
}

function Choice<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { label: string; value: T }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ marginBottom: 6, fontWeight: 600 }}>{label}</div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {options.map((o) => (
          <button
            key={o.value}
            aria-pressed={value === o.value}
            onClick={() => onChange(o.value)}
            style={{
              ...pillStyle,
              background: value === o.value ? "#1368ce" : "#fff",
              color: value === o.value ? "#fff" : "#222",
            }}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// turns ['skis', 'snowboard'] into [{ label: 'Skis', value: 'skis' }, ...]
const opts = <T extends string>(...values: T[]) =>
  values.map((v) => ({ label: v[0].toUpperCase() + v.slice(1), value: v }));

// ---------- page ----------
export default function Menu({
  onSubmit,
  submitLabel = "Save skier",
}: {
  onSubmit?: (skier: SkierConfig) => void;
  submitLabel?: string;
}) {
  const [skier, setSkier] = useState<SkierConfig>(loadSkier);
  const [saved, setSaved] = useState(false);

  const update = <K extends keyof SkierConfig>(
    key: K,
    value: SkierConfig[K],
  ) => {
    setSkier((s) => ({ ...s, [key]: value }));
    setSaved(false);
  };

  const randomizeOutfit = () => {
    setSkier((s) => ({ ...randomOutfit(), name: s.name })); // keep the typed name
    setSaved(false);
  };

  useEffect(() => {
    if (!saved) return;
    const t = setTimeout(() => setSaved(false), 2000);
    return () => clearTimeout(t);
  }, [saved]);

  const save = () => {
    const finalSkier = { ...skier, name: skier.name.trim() || "Skier" };
    setSkier(finalSkier);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(finalSkier));
    setSaved(true);
    onSubmit?.(finalSkier);
  };

  return (
    <>
      <Snow />

      <div className="menu-wrap">
        <h1>Menu</h1>

        <div style={{ display: "flex", gap: 28, flexWrap: "wrap" }}>
          <div className="skier-stage">
            <SkierPreview c={skier} />
            <div style={{ fontWeight: 700, minHeight: 24, marginTop: 6 }}>
              {skier.name || "Your skier"}
            </div>
          </div>

          <div style={{ flex: 1, minWidth: 260 }}>
            <div style={{ marginBottom: 16 }}>
              <label>
                <div style={{ marginBottom: 6, fontWeight: 600 }}>Name</div>
                <input
                  value={skier.name}
                  maxLength={16}
                  placeholder="Choose a name"
                  onChange={(e) => update("name", e.target.value)}
                  style={{ padding: 8, fontSize: 16, width: "100%" }}
                />
              </label>
              <button
                style={{ ...pillStyle, marginTop: 8 }}
                onClick={() => update("name", randomName())}
              >
                🎲 Random name
              </button>
            </div>

            <div style={{ marginBottom: 16 }}>
              <button style={pillStyle} onClick={randomizeOutfit}>
                🎲 Randomize outfit
              </button>
            </div>

            <Choice
              label="Gear"
              value={skier.gear}
              onChange={(v) => update("gear", v)}
              options={opts<Gear>("skis", "snowboard", "bobsled")}
            />
            <ColorPicker
              label="Gear color"
              value={skier.gearColor}
              onChange={(v) => update("gearColor", v!)}
            />

            <h2>Face and hair</h2>
            <Choice
              label="Hair"
              value={skier.hairStyle}
              onChange={(v) => update("hairStyle", v)}
              options={opts<HairStyle>(
                "none",
                "short",
                "ponytail",
                "curly",
                "long",
              )}
            />
            {(skier.hairStyle !== "none" || skier.beard !== "none") && (
              <ColorPicker
                label="Hair color"
                value={skier.hairColor}
                options={HAIRS}
                onChange={(v) => update("hairColor", v!)}
              />
            )}
            <Choice
              label="Eyes"
              value={skier.eyes}
              onChange={(v) => update("eyes", v)}
              options={opts<Eyes>("dots", "happy", "wide")}
            />
            <Choice
              label="Mouth"
              value={skier.mouth}
              onChange={(v) => update("mouth", v)}
              options={opts<Mouth>("smile", "grin", "flat")}
            />
            <Choice
              label="Beard"
              value={skier.beard}
              onChange={(v) => update("beard", v)}
              options={opts<Beard>("none", "short", "full")}
            />
            <ColorPicker
              label="Skin tone"
              value={skier.skin}
              options={SKINS}
              onChange={(v) => update("skin", v!)}
            />

            <h2>Clothes</h2>
            <Choice
              label="Hat"
              value={skier.hatStyle}
              onChange={(v) => update("hatStyle", v)}
              options={opts<HatStyle>("none", "beanie", "cap", "helmet")}
            />
            {skier.hatStyle !== "none" && (
              <ColorPicker
                label="Hat color"
                value={skier.hatColor}
                onChange={(v) => update("hatColor", v!)}
              />
            )}
            {skier.hatStyle === "beanie" && (
              <Choice
                label="Pom-pom size"
                value={skier.pomSize}
                onChange={(v) => update("pomSize", v)}
                options={opts<PomSize>("small", "medium", "large")}
              />
            )}
            <ColorPicker
              label="Shirt color"
              value={skier.shirtColor}
              onChange={(v) => update("shirtColor", v!)}
            />
            <Choice
              label="Jacket pattern"
              value={skier.pattern}
              onChange={(v) => update("pattern", v)}
              options={opts<Pattern>("none", "stripes", "checks", "snowflake")}
            />
            {skier.pattern !== "none" && (
              <ColorPicker
                label="Pattern color"
                value={skier.patternColor}
                onChange={(v) => update("patternColor", v!)}
              />
            )}
            <ColorPicker
              label="Pants color"
              value={skier.pantsColor}
              onChange={(v) => update("pantsColor", v!)}
            />
            <ColorPicker
              label="Boots"
              value={skier.bootColor}
              onChange={(v) => update("bootColor", v!)}
            />
            <ColorPicker
              label="Mittens"
              value={skier.mittenColor}
              onChange={(v) => update("mittenColor", v)}
              allowNone
            />

            <h2>Accessories</h2>
            <ColorPicker
              label="Scarf"
              value={skier.scarfColor}
              onChange={(v) => update("scarfColor", v)}
              allowNone
            />
            <ColorPicker
              label="Goggles"
              value={skier.gogglesColor}
              onChange={(v) => update("gogglesColor", v)}
              allowNone
            />
            <ColorPicker
              label="Sunglasses"
              value={skier.shadesColor}
              onChange={(v) => update("shadesColor", v)}
              allowNone
            />
            <ColorPicker
              label="Ear muffs"
              value={skier.earColor}
              onChange={(v) => update("earColor", v)}
              allowNone
            />
            <ColorPicker
              label="Face mask"
              value={skier.maskColor}
              onChange={(v) => update("maskColor", v)}
              allowNone
            />
            <ColorPicker
              label="Backpack"
              value={skier.packColor}
              onChange={(v) => update("packColor", v)}
              allowNone
            />

            <button
              onClick={save}
              style={{
                padding: "10px 20px",
                fontSize: 16,
                borderRadius: 8,
                border: "none",
                background: "#26890c",
                color: "#fff",
                cursor: "pointer",
              }}
            >
              {onSubmit ? submitLabel : saved ? "Saved ✓" : "Save skier"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
