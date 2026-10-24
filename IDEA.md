# Calgary '88: Relight the Flame — Agent Build Guide

You are building a hackathon entry. **Deadline: Sunday.** Theme: **"revitalize."**
Optimize for a working, polished demo, not for completeness. Ship the smallest version of each section first, then improve it.

## Concept

This is a browser revival of the 1988 Calgary Winter Olympics. A big screen (laptop or TV) hosts the experience, and players join from their phones, which act as controllers. It has three sections:

1. **Menu**: the landing screen with an '88-styled title, a room code, and links to each section.
2. **Ski Jump**: a 2D side-view ski jump game controlled by phone tilt and taps.
3. **Bricks**: a live commemorative brick wall, inspired by the Olympic Plaza bricks, where people add a name or memory from their phone.

## Stack (do not change without asking)

- **Vite + React + TypeScript** is the app shell.
- **React Router** handles the routes listed below.
- **Phaser 3** runs the ski jump game, mounted only on the game route.
- **Supabase** provides Postgres for bricks and **Realtime broadcast channels** for phone-to-screen input.
- **Deploy:** Vercel or Netlify for the static frontend. Do not set up a custom WebSocket server.

Env vars go in `.env.local` (never commit):
```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

## Routes

| Route | Device | Purpose |
|---|---|---|
| `/` | Big screen | Menu, room code display, QR code to join |
| `/game/:room` | Big screen | Phaser ski jump |
| `/play/:room` | Phone | Controller (tilt + tap) |
| `/bricks` | Big screen | Live brick wall |
| `/bricks/add` | Phone | Form to add a brick |

## Project structure

```
src/
  main.tsx
  App.tsx                 # router
  lib/
    supabase.ts           # client
    room.ts               # generate/validate 4-letter room codes
    channel.ts            # realtime helpers (join, send, subscribe)
  pages/
    Menu.tsx
    GamePage.tsx          # mounts Phaser in useEffect, destroys on unmount
    Controller.tsx
    Bricks.tsx
    AddBrick.tsx
  game/
    config.ts
    scenes/
      BootScene.ts
      JumpScene.ts
      ResultsScene.ts
  styles/
    theme.css             # '88 palette + type
public/
  assets/                 # sprites, sounds
```

## Realtime protocol

Use one Supabase broadcast channel per room, named `room:{CODE}`.

Phone → screen events:
```ts
{ type: 'join',  playerId: string, name: string }
{ type: 'tilt',  playerId: string, beta: number, gamma: number }   // throttle to ~20/s
{ type: 'press', playerId: string, action: 'jump' | 'tuck' }
{ type: 'release', playerId: string, action: 'tuck' }
```

Screen → phone events:
```ts
{ type: 'state', phase: 'lobby' | 'inrun' | 'flight' | 'landed', activePlayerId?: string }
{ type: 'result', playerId: string, distance: number }
```

- Generate `playerId` with `crypto.randomUUID()` and store it in `sessionStorage`, wrapped in try/catch.
- On iOS, `DeviceOrientationEvent.requestPermission()` **must** be called from a user tap. Show an "Enable motion" button first.
- Always provide a tap-only fallback in case tilt is unavailable.

## Ski jump gameplay (MVP)

The game is turn-based, with one jumper at a time and the others watching their phones.

1. **Inrun:** the skier slides down the ramp. Holding **tuck** increases speed.
2. **Takeoff:** the player taps **jump** near the ramp lip. Timing accuracy sets the launch boost (perfect / good / late).
3. **Flight:** phone tilt (`beta`) controls body angle. Too flat or too steep adds drag, and the sweet spot extends the glide.
4. **Landing:** the game measures distance in meters from the ramp lip and shows a results screen.
5. A **leaderboard** for the room is kept in memory on the screen. Persistence is optional.

Use Arcade physics or simple custom velocity math, whichever is faster to get feeling good. Placeholder rectangles are fine until the loop works.

## Bricks

Supabase table:
```sql
create table bricks (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) <= 40),
  message text check (char_length(message) <= 80),
  created_at timestamptz default now()
);
alter table bricks enable row level security;
create policy "read all"   on bricks for select using (true);
create policy "insert any" on bricks for insert with check (true);
```

- `/bricks` renders a CSS grid of brick-shaped divs and subscribes to `postgres_changes` inserts so new bricks animate in live.
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
4. [ ] Build the Phaser game loop with keyboard controls: inrun, takeoff, flight, landing, distance.
5. [ ] Swap keyboard input for phone events (tap first, then tilt).
6. [ ] Build the Bricks wall with the add form, live inserts, and seed data.
7. [ ] Add the results screen and room leaderboard.
8. [ ] Polish: sprites, sound, transitions, and '88 styling.
9. [ ] Stretch goals: confetti or a flame on a record jump, multiple players' ghosts, persisted high scores.

## Definition of done

- A judge can open `/`, scan the QR with a phone, and play a full jump.
- A judge can add a brick from a phone and see it appear on the wall live.
- No console errors, and it works in Chrome desktop plus iOS Safari and Android Chrome.
- The README covers how to run it, the concept, and how it fits "revitalize."

## Rules for the agent

- Don't add frameworks, state libraries, or a backend server beyond what's listed.
- Keep secrets out of git. Only the anon key goes in the client.
- If something blocks you for more than about 20 minutes, choose the simpler path and leave a `TODO:` note.
- Test the phone flow on a real device over the deployed URL. Motion sensors require HTTPS.
- Before marking a step done, run `npm run build` and confirm it passes.