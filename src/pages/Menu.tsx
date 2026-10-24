import { useState, useEffect } from "react";

type Gear = "skis" | "snowboard" | "bobsled";
type HatStyle = "none" | "beanie" | "cap" | "helmet";

export type SkierConfig = {
  name: string;
  gear: Gear;
  hatStyle: HatStyle;
  hatColor: string;
  scarfColor: string | null;
  gogglesColor: string | null;
  mittenColor: string | null;
  shirtColor: string;
  pantsColor: string;
  bootColor: string;
  skin: string;
};

const COLORS = [
  { label: "Red", value: "#e21b3c" },
  { label: "Blue", value: "#1368ce" },
  { label: "Yellow", value: "#f5c400" },
  { label: "Green", value: "#26890c" },
  { label: "Orange", value: "#f57c00" },
  { label: "Purple", value: "#7b3fbf" },
  { label: "Black", value: "#222222" },
  { label: "White", value: "#f5f5f5" },
];

const SKINS = [
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
  hatStyle: "beanie",
  hatColor: COLORS[0].value,
  scarfColor: COLORS[1].value,
  gogglesColor: null,
  mittenColor: COLORS[2].value,
  shirtColor: COLORS[3].value,
  pantsColor: COLORS[6].value,
  bootColor: "#333333",
  skin: "#f1c27d",
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
const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const randColor = () => pick(COLORS).value;

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
  hatStyle: pick<HatStyle>(["none", "beanie", "cap", "helmet"]),
  hatColor: randColor(),
  scarfColor: Math.random() < 0.7 ? randColor() : null,
  gogglesColor: Math.random() < 0.6 ? randColor() : null,
  mittenColor: Math.random() < 0.8 ? randColor() : null,
  shirtColor: randColor(),
  pantsColor: randColor(),
  bootColor: randColor(),
  skin: pick(SKINS).value,
});

// ---------- preview ----------
function SkierPreview({ c }: { c: SkierConfig }) {
  return (
    <svg
      viewBox="0 0 200 250"
      width="200"
      height="250"
      role="img"
      aria-label="Skier preview"
    >
      {/* skis and snowboard (the bobsled is drawn later, over the legs) */}
      {c.gear === "skis" ? (
        <>
          <rect x="62" y="213" width="36" height="4" rx="2" fill="#444" />
          <rect x="102" y="213" width="36" height="4" rx="2" fill="#444" />
        </>
      ) : c.gear === "snowboard" ? (
        <rect x="52" y="212" width="96" height="9" rx="4" fill="#444" />
      ) : null}

      {/* legs and boots */}
      <rect x="80" y="150" width="19" height="58" rx="6" fill={c.pantsColor} />
      <rect x="101" y="150" width="19" height="58" rx="6" fill={c.pantsColor} />
      <rect x="78" y="204" width="23" height="9" rx="3" fill={c.bootColor} />
      <rect x="99" y="204" width="23" height="9" rx="3" fill={c.bootColor} />

      {/* arms and torso */}
      <rect x="62" y="94" width="14" height="48" rx="7" fill={c.shirtColor} />
      <rect x="124" y="94" width="14" height="48" rx="7" fill={c.shirtColor} />
      <rect x="76" y="88" width="48" height="66" rx="10" fill={c.shirtColor} />

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
            fill="#c62828"
          />
          <rect x="37" y="176" width="126" height="5" rx="2" fill="#f5f5f5" />
          <rect x="46" y="219" width="108" height="4" rx="2" fill="#888" />
          <rect x="64" y="212" width="5" height="8" rx="1" fill="#888" />
          <rect x="131" y="212" width="5" height="8" rx="1" fill="#888" />
        </>
      )}

      {/* head */}
      <circle cx="100" cy="60" r="22" fill={c.skin} />
      <circle cx="93" cy="60" r="2.5" fill="#222" />
      <circle cx="107" cy="60" r="2.5" fill="#222" />

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

      {/* scarf */}
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
          <rect
            x="108"
            y="88"
            width="12"
            height="30"
            rx="5"
            fill={c.scarfColor}
          />
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
              <circle cx="100" cy="29" r="6" fill={c.hatColor} />
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
    </svg>
  );
}

// ---------- small UI pieces ----------
type Swatch = { label: string; value: string };

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
              ...swatch,
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
              ...swatch,
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
              ...pill,
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

const swatch: React.CSSProperties = {
  width: 34,
  height: 34,
  borderRadius: "50%",
  border: "1px solid #999",
  cursor: "pointer",
  outlineOffset: 2,
};

const pill: React.CSSProperties = {
  padding: "8px 14px",
  borderRadius: 8,
  border: "1px solid #bbb",
  cursor: "pointer",
  background: "#fff",
  color: "#222",
};

// ---------- page ----------
export default function Menu() {
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
  };

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: 20 }}>
      <h1>Menu</h1>

      <div style={{ display: "flex", gap: 32, flexWrap: "wrap" }}>
        <div style={{ textAlign: "center" }}>
          <SkierPreview c={skier} />
          <div style={{ fontWeight: 700, minHeight: 24 }}>
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
              style={{ ...pill, marginTop: 8 }}
              onClick={() => update("name", randomName())}
            >
              🎲 Random name
            </button>
          </div>

          <Choice
            label="Gear"
            value={skier.gear}
            onChange={(v) => update("gear", v)}
            options={[
              { label: "Skis", value: "skis" },
              { label: "Snowboard", value: "snowboard" },
              { label: "Bobsled", value: "bobsled" },
            ]}
          />

          <Choice
            label="Hat"
            value={skier.hatStyle}
            onChange={(v) => update("hatStyle", v)}
            options={[
              { label: "None", value: "none" },
              { label: "Beanie", value: "beanie" },
              { label: "Cap", value: "cap" },
              { label: "Helmet", value: "helmet" },
            ]}
          />

          {skier.hatStyle !== "none" && (
            <ColorPicker
              label="Hat color"
              value={skier.hatColor}
              onChange={(v) => update("hatColor", v!)}
            />
          )}
          <ColorPicker
            label="Scarf"
            value={skier.scarfColor}
            onChange={(v) => update("scarfColor", v)}
            allowNone
          />
          <ColorPicker
            label="Shirt color"
            value={skier.shirtColor}
            onChange={(v) => update("shirtColor", v!)}
          />
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
          <ColorPicker
            label="Goggles"
            value={skier.gogglesColor}
            onChange={(v) => update("gogglesColor", v)}
            allowNone
          />
          <ColorPicker
            label="Skin tone"
            value={skier.skin}
            options={SKINS}
            onChange={(v) => update("skin", v!)}
          />

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button style={pill} onClick={randomizeOutfit}>
              🎲 Randomize outfit
            </button>
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
              {saved ? "Saved ✓" : "Save skier"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
