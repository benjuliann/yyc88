# YYC '88: Race the Legacy

**In 1988, Calgary hosted the Winter Olympics. This project asks what happens to a moment like that after the flame goes out.**

The Games are a photograph in a newspaper and a field of engraved bricks in Olympic Plaza. We rebuilt the moment as something you can play. The living room TV is the stadium, your phone is the ski jump, and when the race is over your name is set into the plaza the way a visitor's name once was.

DISCLAIMER: Not affiliated with or endorsed by the IOC, COC or CODA.

---

## What is it?

One browser tab on a big screen hosts the Games. Up to five people join from their phones by scanning a QR code or typing a four-letter room code.

1. **Lobby.** The big screen shows a room code and QR. Players join, and each one dresses their own skier on their phone.
2. **Opening ceremony.** The camera flies over a low-poly Winter Olympics hill and then walks down a lineup of the racers who joined.
3. **Ski jump.** Players jump one at a time. You hold the phone sideways like a steering wheel, tilt it to keep your balance, and lift it to launch at the lip. The skier flies up to 200 m. Land it and the crowd cheers. Lose your balance and you tumble down the slope.
4. **Podium.** The racers are ranked by distance and stand on a podium.
5. **Olympic Plaza.** Each racer's name is laid into a brick on a 3D night-time recreation of the old plaza. The bricks are saved, so the plaza fills up with every race anyone has ever run.

The `/bricks` plaza page also has a scan of the **Calgary Herald, February 29, 1988**. Click it to open it, then zoom and drag to read the front page.

## Why this and not a museum page?

The real Olympic Plaza had thousands of engraved bricks, each with a name on it. The plaza was the memory of the Games, and the names were the people who showed up. That gave us the central idea: **a memory stays alive when people keep adding to it.**

So the game isn't just a game. Every race ends by writing real names into the plaza. The bricks are never edited or deleted from the app, and a visitor next week sees the people who played this week. We wanted the 1988 Games to be something that grows, not something that is only looked at.

## How it works

```
 Big screen                                        Phone
 ┌──────────────────────────────┐                  ┌───────────────────────┐
 │ /            Landing         │                  │ /play/:room           │
 │ /game/:room  Lobby → Race    │                  │   join + name         │
 │              → Plaza ceremony│                  │   /customize skier    │
 │ /bricks      Olympic Plaza   │                  │   TiltPad controller  │
 └──────┬───────────────▲───────┘                  └──────┬───────▲────────┘
        │ state/{room}  │ input/{room}/{player}           │       │
        │               │                                 │       │
        ▼               │                                 ▼       │
 ┌─────────────────────────────────────────────────────────────────────────┐
 │ Firebase Realtime Database  →  live tilt, jump taps, "whose turn" state │
 │ Firebase Firestore          →  rooms, players, skiers, memorial bricks  │
 └─────────────────────────────────────────────────────────────────────────┘
```

### Two databases

Firestore handles about one sustained write per second per document, which is too slow for steering. So the project uses both:

- **Firestore** holds things that change rarely and should survive a refresh: rooms (`rooms/{CODE}`), players (`rooms/{CODE}/players/{id}`, including the customized skier) and the memorial **bricks** (`bricks/{id}`, which only contain `{ name, createdAt }`).
- **Realtime Database** carries the fast stuff. The phone writes its latest input to `input/{room}/{player}` and the screen writes the run state (whose turn, phase, balance, take-off bar) to `state/{room}` so the phone can show the same meters.

### Phone as controller

[TiltPad](src/components/TiltPad.tsx) reads the phone's accelerometer. With the phone held sideways, gravity swings along the screen's short and long edges, so the tilt angle is `atan2` of those two axes. We normalize the sign so steering feels the same in either landscape direction. A dead zone ignores small wobble. Lifting the phone (acceleration above gravity) counts as the jump, with a cooldown to stop double triggers. iOS only allows motion data after a tap, so the controller asks first.

### Two clocks that disagree

A phone's jump takes time to reach the screen, and the two device clocks never match. Every input is stamped with Firebase's server time, and each device learns its offset from `.info/serverTimeOffset` ([input.ts](src/lib/input.ts)). At the lip the skier waits a short moment for a jump that was pressed in time but arrived late, so network lag doesn't cost you a perfect launch.

### The ski jump

[SkiJumpPage](src/pages/SkiJumpPage.tsx) draws the scene with plain Three.js and runs a phase machine: `loading → opening → lineup → ready → countdown → inrun → flight → next → done`, with `crash` and `fall` for wipeouts. The game feel is a handful of named constants at the top of the file (drift, gusts, crosswind, steering force, timing window), so changing the difficulty is a one-line edit.

Distance is `200 m × balance × timing`, rounded to 5 m. Each racer gets two tries, because a wipeout earns a second go.

### Animation made in Blender, played in the browser

There is no physics engine. The jump is pre-animated in Blender, with one clip for **every 5 m from 0 to 200 m**. That makes 41 jump clips and 41 fall clips, listed in [manifest.json](public/models/calgary/manifest.json). All clips are identical up to takeoff (frame 112), so the in-run plays from any of them, and at takeoff the game swaps to the clip for the distance the player earned. The skier is a separate rig with six clips (Idle, Tuck, Takeoff, Flight, Land, Fall) and a crowd with six cheer clips. [A README next to the model](public/models/calgary/character/README.txt) documents its conventions and the scripts that built it.

### The plaza

[PlazaScene](src/memorial/PlazaScene.tsx) loads a model of the historical plaza and engraves names onto the pavers that are close enough to read, with at most 160 engraved bricks, so it stays smooth on a phone. Each brick gets a stable shade based on its id, so it looks the same every visit. After a race the ceremony holds on empty pavers, drops each new name into place one at a time, then slowly pulls back out to the full plaza.

### Customizing your skier

[CustomizePage](src/pages/CustomizePage.tsx) is a character builder with gear (skis, snowboard or bobsled), hats, hair, face, scarf, goggles, patterns and colors. The choice is saved to the player's Firestore document, so the big screen dresses your skier the way you built it.

## Stack

| Layer                | Tech                                                                                 |
| -------------------- | ------------------------------------------------------------------------------------ |
| App shell            | **React 19**, **TypeScript**, **Vite**                             |
| Routing              | **React Router 7**                                                             |
| 3D                   | **Three.js** (plain, no react-three-fiber), `GLTFLoader`, `AnimationMixer` |
| 3D assets            | **Blender** models and animation exported as `.glb`                          |
| Realtime and storage | **Firebase** Firestore and Realtime Database                                   |
| UI motion            | **Motion** (`motion/react`)                                                  |
| Styling              | **Tailwind CSS 4** and plain CSS                                               |
| Phone pairing        | `react-qr-code`, DeviceMotion / DeviceOrientation                                  |
| Tooling              | **oxlint**, `@vitejs/plugin-basic-ssl` for local HTTPS                       |
| Hosting              | **Vercel** (static, with an SPA rewrite)                                       |

There is no custom server. The only backend is Firebase, and security is done with rules. [firestore.rules](firestore.rules) checks the shape of every write: room codes must be four letters with no I or O, names are 1 to 20 characters, and bricks can be created but never edited or deleted from the app.

## Run it

```bash
npm install
```

Create `.env.local` with your Firebase web config:

```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_DATABASE_URL=
```

Then paste [firestore.rules](firestore.rules) into the Firestore rules tab of your Firebase console, and set Realtime Database rules that allow reads and writes under `input/` and `state/`. 

```bash
npm run dev      # Vite dev server over HTTPS
npm run build    # type-check and production build
npm run lint
```

The dev server uses a self-signed certificate on purpose. Phones only expose motion sensors over HTTPS, so open the HTTPS address printed by Vite on your computer, then scan the QR code with a phone on the same network (accept the certificate warning). The deployed Vercel URL works the same way.

**To play:** open `/` on the big screen, press the race button, scan the QR with a phone, enter a name, optionally dress your skier, and press Start on the big screen. Go to `/bricks` any time to see the plaza.

### Routes

| Route                                                  | Device     | Purpose                                                           |
| ------------------------------------------------------ | ---------- | ----------------------------------------------------------------- |
| `/`                                                  | Big screen | Landing page, creates a room                                      |
| `/game/:room`                                        | Big screen | Lobby, then the race, then the plaza ceremony                     |
| `/play/:room`                                        | Phone      | Join, name, and tilt controller                                   |
| `/play/:room/customize`                              | Phone      | Skier builder                                                     |
| `/bricks`                                            | Big screen | Olympic Plaza with every brick ever laid, plus the 1988 newspaper |
| `/jump`, `/model-test`, `/controller-test/:room` | Dev        | Solo jump and test pages used while building                      |

## What we'd do next

- Persist a leaderboard of the longest jumps across rooms, not just the bricks.
- Let people tap a brick in the plaza to see who laid it and when.
- Add the other events from the '88 Games: snowboard and bobsled are already gear options in the skier builder.
