# 🕹️ Web Retro Arcade (80s & 90s Neon Synthwave Edition)

A classic gaming platform and retro emulator web application featuring **live Twitch broadcasting**, **auto-handoff queues**, **4-way Quad Split Arena**, and **in-browser 60 FPS video recording**.

Built with React, TypeScript, Tailwind CSS, Vite, EmulatorJS, and Cloudflare Workers.

---

## ✨ Key Features

### 🌆 1. Authentic 80s/90s Neon Sun Synthwave Aesthetic
- **Color Palette**: Electric Cyan/Blue (`#00f0ff`), Sunset Orange (`#ff7700`), Laser Lime Green (`#39ff14`), Hot Magenta (`#ff007f`), and Synth Void Dark Mode (`#060814`).
- **Retro Sun & 3D Horizon Grid**: Layered animated retro sun with horizontal laser cutouts and 3D wireframe perspective floor.
- **CRT Cabinet Emulation**: Authentic toggleable CRT scanlines, curved screen curvature vignette, and retro arcade cabinet controls.

### 🎮 2. Dual Gameplay Modes
Whenever a player launches a game, an interactive modal allows selecting their mode:
- **Stream Live on Twitch**:
  - Connects to the live broadcast pipeline.
  - Enforces the **1-Streamer Broadcast Lock** or triggers the **4-Player Quad Arena**.
- **Play Solo (Private Session)**:
  - 100% private session with zero stream bandwidth transmission.
  - Exact same 60 FPS emulator look and feel.
  - Includes real-time **Session Video Recording** to export and download `.webm` gameplay clips.

### 📡 3. Live Streaming & Concurrency Orchestration
- **Single-Streamer Lock & Auto-Handoff Queue**:
  - Exactly 1 player is broadcasted to the Twitch channel at a time.
  - Standby players are queued with real-time on-deck position tracking.
  - Automatic promotion to live broadcast when the active streamer leaves.
- **4-Player Quad-Grid Screen Compositor**:
  - Triggers automatically when 4+ players choose streaming mode.
  - 4-quadrant layout (Top-Left, Top-Right, Bottom-Left, Bottom-Right) with unique neon borders and player metadata tags.

### 📼 4. Session Video Recording (`MediaRecorder`)
- In-browser 60 FPS video capture from emulator canvas and audio.
- Live HUD overlay with blinking `[REC 00:01:23]` pill and timer.
- Post-session modal with built-in WebM video preview player, instant `.webm` download, and social sharing shortcuts for X (Twitter), Reddit, and clipboard links.

### 🕹️ 5. Built-in Retro Game Vault
Pre-seeded with 10 homebrew and public domain classics across multiple retro systems:
- **NES**: Space Invaders Deluxe, Flappy Bird 8-Bit, Driar Arcade Adventure, Blaster Master Retro, Bomb Array Strategy, Babel Blox Puzzle.
- **SNES**: Astro Hawk 16-Bit.
- **GBA**: Anguna: Warriors of the Demonic Lord, Asteroids 32-Bit Enhanced.
- **Genesis / Mega Drive**: Barbarian Arcade Action.
- Plus drag-and-drop custom ROM upload support!

---

## 🏗️ Architecture & Packages

```
web-retro-arcade/
├── client/                     # React + Vite frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── EmulatorPlayer.tsx        # CRT cabinet, HUD, recording & streaming controls
│   │   │   ├── Hero.tsx                  # 80s synthwave sun & horizon grid
│   │   │   ├── StreamModeModal.tsx       # Live Twitch vs Solo choice modal
│   │   │   ├── SessionRecordingModal.tsx # WebM replay player & export modal
│   │   │   ├── QuadStreamArena.tsx       # 4-quadrant split screen arena view
│   │   │   ├── LiveTwitchBar.tsx         # Real-time Twitch broadcast header bar
│   │   │   ├── GameCard.tsx              # Neon game cards with pixel art
│   │   │   └── SystemCard.tsx            # Console filter cards
│   │   ├── lib/
│   │   │   ├── streamManager.ts          # WebSocket stream queue & quad coordinator
│   │   │   ├── videoRecorder.ts          # 60 FPS canvas MediaRecorder engine
│   │   │   └── api.ts                    # Backend & ROM API client
│   │   └── index.css                     # Neon glow, synth sun, CRT scanline styles
│   └── public/
│       ├── roms/                         # Seeded public domain ROMs
│       └── covers/                       # High-res box art images
├── cloudflare-worker/          # Cloudflare Worker package
│   ├── src/
│   │   ├── streamCoordinator.ts  # Durable Object managing queues & quad arena
│   │   └── index.ts              # WHIP live ingest proxy & Twitch RTMP egress
│   └── wrangler.toml             # Cloudflare Workers configuration
├── server/                     # Express development server & storage
│   ├── storage.ts                # Seeded games & in-memory database
│   └── routes.ts                 # API routes & secure ROM serving
└── api/                        # Vercel Serverless Function entrypoint
```

---

## 🚀 Getting Started

### Local Development
```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

### Production Build
```bash
# Build Vite client assets into dist/public
npm run build

# Start production server
npm start
```

### Cloudflare Worker Deployment
See [CLOUDFLARE_STREAM_GUIDE.md](CLOUDFLARE_STREAM_GUIDE.md) for full instructions on configuring Cloudflare Stream Live WHIP ingest and Twitch RTMP outputs.

```bash
cd cloudflare-worker
npm install
npx wrangler secret put CLOUDFLARE_ACCOUNT_ID
npx wrangler secret put CLOUDFLARE_STREAM_API_TOKEN
npx wrangler secret put TWITCH_STREAM_KEY
npx wrangler deploy
```

---

## 📜 Legal & Emulation
Emulators are legal software. Built-in titles are public domain or open homebrew releases. Ensure you own any custom ROM files you upload and play.
