# Calgary '88: Relight the Flame — Agent Build Guide

You are building a hackathon entry. **Deadline: Sunday.** Theme: **"revitalize."**
Optimize for a working, polished demo, not for completeness. Ship the smallest version of each section first, then improve it.

## Concept

This is a browser revival of the 1988 Calgary Winter Olympics. A big screen (laptop or TV) hosts the experience, and players join from their phones, which act as controllers. It has three sections:

1. **Menu**: the landing screen with an '88-styled title, a room code, and links to each section.
2. **Ski Jump**: a 3D ski jump game, viewed from a side-on camera, built from our own Blender models and controlled by phone tilt and taps.
3. **Bricks**: a live commemorative brick wall, inspired by the Olympic Plaza bricks, where people add a name or memory from their phone.

## Stack (do not change without asking)

- **Vite + React + TypeScript** is the app shell.
- **React Router** handles the routes listed below.
- **Three.js** (plain, no react-three-fiber) renders the ski jump game, mounted only on the game route. Models are made in Blender and loaded as `.glb` files with `GLTFLoader`.
- **Firebase** is the backend. **Firestore** stores rooms, players and bricks. **Realtime Database** carries live controller input (tilt, taps), because Firestore only handles about one sustained write per second per document.
- **Deploy:** Vercel or Netlify for the static frontend. Do not set up a custom WebSocket server.

Env vars go in `.env.local` (never commit):
```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_DATABASE_URL=      # Realtime Database, for controller input
```

## Routes

| Route | Device | Purpose |
|---|---|---|
| `/` | Big screen | Menu, room code display, QR code to join |
| `/game/:room` | Big screen | Lobby (room code, QR, players), then the Three.js ski jump |
| `/play/:room` | Phone | Controller (tilt + tap) |
| `/bricks` | Big screen | Live brick wall |
| `/bricks/add` | Phone | Form to add a brick |

## Project structure

```
src/
  main.tsx
  App.tsx                 # router
  lib/
    firebase.ts           # Firebase app, Firestore and Realtime Database clients
    room.ts               # room codes, lobby, players (Firestore)
    input.ts              # live controller input (Realtime Database)
  pages/
    Menu.tsx
    GamePage.tsx          # mounts the Three.js game in useEffect, destroys on unmount
    Controller.tsx
    Bricks.tsx
    AddBrick.tsx
  game/
    createGame.ts         # scene, camera, renderer, render loop; returns destroy()
    physics.ts            # 2D inrun/takeoff/flight/landing math (x, y)
    models.ts             # loads and caches .glb models
  styles/
    theme.css             # '88 palette + type
public/
  models/                 # .glb exports from Blender
  assets/                 # sounds
```

## Realtime protocol

Room and lobby state live in Firestore and are already built in `src/lib/room.ts`:

- `rooms/{CODE}`: `{ phase: 'lobby' | 'playing', activePlayerId?: string }`
- `rooms/{CODE}/players/{playerId}`: `{ name, joinedAt }`
- `rooms/{CODE}/results/{id}`: `{ playerId, distance, createdAt }` for the leaderboard

Live controller input goes through Realtime Database at `input/{CODE}/{playerId}`. The phone overwrites its latest state, and the screen listens with `onValue`:
```ts
{ beta: number, tuck: boolean, jumpAt: number | null }   // throttle tilt to ~20/s; jumpAt = time of the last jump tap
```

Phones learn whose turn it is and the game phase by watching `rooms/{CODE}`, and their distance from `rooms/{CODE}/results`.

- Generate `playerId` with a random string (not `crypto.randomUUID()`, which is missing on plain-HTTP pages) and store it in `sessionStorage`, wrapped in try/catch.
- On iOS, `DeviceOrientationEvent.requestPermission()` **must** be called from a user tap. Show an "Enable motion" button first.
- Always provide a tap-only fallback in case tilt is unavailable.

## Ski jump gameplay (MVP)

The game is turn-based, with one jumper at a time and the others watching their phones.

1. **Inrun:** the skier slides down the ramp. Holding **tuck** increases speed.
2. **Takeoff:** the player taps **jump** near the ramp lip. Timing accuracy sets the launch boost (perfect / good / late).
3. **Flight:** phone tilt (`beta`) controls body angle. Too flat or too steep adds drag, and the sweet spot extends the glide.
4. **Landing:** the game measures distance in meters from the ramp lip and shows a results screen.
5. A **leaderboard** for the room is kept in memory on the screen. Persistence is optional.

Keep the physics as simple custom 2D velocity math on x and y. Three.js only draws the scene, so no physics engine is needed. Placeholder boxes are fine until the loop works, and the Blender models replace them afterward.

## 3D assets (Blender)

- Export each model from Blender with **File → Export → glTF 2.0**, choosing the **.glb** format. Apply modifiers and include animations.
- Save the exports in `public/models/` with simple names such as `skier.glb`, `ramp.glb` and `tower.glb`.
- Model in meters, and point the skier down the ramp along +X so it matches the side-on camera.
- Keep models low-poly with small textures, and aim for under about 5 MB in total so the game loads quickly on venue Wi-Fi.
- Every model needs a placeholder box in code, so the game still runs before an asset is ready.

## Bricks

Firestore collection `bricks`, one document per brick: `{ name, message, createdAt }`.

Security rules so anyone can read and add bricks, with length limits:
```
match /bricks/{id} {
  allow read: if true;
  allow create: if request.resource.data.name is string
    && request.resource.data.name.size() <= 40
    && (!('message' in request.resource.data) || request.resource.data.message.size() <= 80);
}
```

- `/bricks` renders a CSS grid of brick-shaped divs and listens with `onSnapshot` so new bricks animate in live.
- `/bricks/add` is a simple mobile form with client-side length limits and a basic profanity filter if time allows.
- Seed about 30 bricks so the wall doesn't look empty during judging.

## Visual style

- The palette is Calgary '88 inspired: red `#D52B1E`, white, deep navy, and warm gold for accents.
- Use chunky retro display type (Google Fonts) and clean sans text.
- Use an original snowflake/flame motif. **Do not reproduce the official 1988 Olympic logo, the Olympic rings, or the Hidy & Howdy mascots.**
- Make it work on phones: big tap targets, no horizontal scroll.

## Build order (priority)

Work top-down. Commit after each step works.

1. [ ] Scaffold Vite + React + TS + Router, set up the theme CSS, and deploy a hello-world to confirm the pipeline.
2. [ ] Build the Menu with room code generation and a QR code linking to `/play/:room`.
3. [ ] Set up the realtime round trip: the phone presses a button and the screen logs it. **Prove this early.**
4. [ ] Build the Three.js game loop with placeholder boxes and keyboard controls: inrun, takeoff, flight, landing, distance.
5. [ ] Swap keyboard input for phone events (tap first, then tilt).
6. [ ] Build the Bricks wall with the add form, live inserts, and seed data.
7. [ ] Add the results screen and room leaderboard.
8. [ ] Polish: swap the placeholder boxes for the Blender models, then add sound, transitions, and '88 styling.
9. [ ] Stretch goals: confetti or a flame on a record jump, multiple players' ghosts, persisted high scores.

## Definition of done

- A judge can open `/`, scan the QR with a phone, and play a full jump.
- A judge can add a brick from a phone and see it appear on the wall live.
- No console errors, and it works in Chrome desktop plus iOS Safari and Android Chrome.
- The README covers how to run it, the concept, and how it fits "revitalize."

## Rules for the agent

- Don't add frameworks, state libraries, or a backend server beyond what's listed.
- Keep secrets out of git. Firebase web config values are public by design, so protect data with Firestore and Realtime Database security rules.
- If something blocks you for more than about 20 minutes, choose the simpler path and leave a `TODO:` note.
- Test the phone flow on a real device over the deployed URL. Motion sensors require HTTPS.
- Before marking a step done, run `npm run build` and confirm it passes.