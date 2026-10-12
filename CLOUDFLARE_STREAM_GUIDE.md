# Web Retro Arcade: Cloudflare Stream & Twitch Integration Guide

Welcome to the **Web Retro Arcade** live streaming architecture guide. This document outlines how the live Twitch broadcasting pipeline, the Cloudflare Worker coordinator, and the 4-way Quad Split Arena operate.

---

## 1. High-Level Architecture

```
[ User Browser ]
   │
   ├── Option 1: SOLO MODE (Private) 
   │     └─► 60 FPS EmulatorJS Canvas ──► MediaRecorder Engine ──► WebM Video Replay (.webm)
   │
   └── Option 2: STREAM LIVE ON TWITCH
         │
         ├── WebSocket ──► Cloudflare Worker (Durable Object: StreamCoordinator)
         │                   ├── Concurrency Queue & Standby Lock (1 Streamer Active)
         │                   ├── Auto-Handoff when active player exits
         │                   └── 4+ Players Trigger: 4-Way Quad Arena (2x2 Grid)
         │
         └── WebRTC (WHIP) ──► Cloudflare Stream Live Ingest
                                 └─► RTMP Egress ──► rtmp://live.twitch.tv/app/{TWITCH_STREAM_KEY}
```

---

## 2. Core Broadcast Features

### A. Dual Gameplay Modes
When a player clicks **Play** on any arcade title, the cabinet prompts an interactive modal:
1. **Stream Live on Twitch**:
   - Joins the live broadcast queue managed by the Cloudflare Worker.
   - Enforces the **1-Streamer Broadcast Lock** or joins the **4-Player Quad Arena**.
2. **Play Solo (Private Session)**:
   - 100% private session with zero stream bandwidth transmission.
   - Exact same 60 FPS emulator look and feel.
   - Includes real-time **Session Video Recording** to export and download `.webm` gameplay clips.

### B. Single-Streamer Lock & Auto-Handoff Queue
- Only **1 active streamer** is broadcasted to the Twitch channel at a time.
- If multiple players choose to stream (e.g. Player 1, Player 2, and Player 3):
  - Player 1 is granted the active broadcast slot (`LIVE ON TWITCH`).
  - Players 2 & 3 are placed on standby with live HUD tracking: `STANDBY QUEUE (#2)`.
  - When Player 1 finishes or leaves the arcade cabinet, Player 2 is **automatically promoted** to the live broadcast slot with zero downtime.

### C. 4-Player Quad-Split Screen Compositor
- If **4 or more players** simultaneously choose to stream:
  - The broadcast coordinator automatically triggers **4-Way Quad Mode**.
  - Screen is composited into a 2x2 grid:
    - **Top-Left (P1)**: Electric Cyan neon border (`#00f0ff`)
    - **Top-Right (P2)**: Sunset Orange neon border (`#ff7700`)
    - **Bottom-Left (P3)**: Laser Lime neon border (`#39ff14`)
    - **Bottom-Right (P4)**: Hot Magenta neon border (`#ff007f`)
  - Each quadrant includes player handle tags, game titles, and system badges.

### D. Session Video Recording (`MediaRecorder`)
- Built-in in-browser video encoding capturing emulator canvas and audio at 60 FPS.
- Live in-game HUD: Blinking `[REC 00:01:45]` indicator.
- Post-session modal:
  - Instant WebM video preview player.
  - Download `.webm` button.
  - Social sharing links for X (Twitter), Reddit, and clipboard sharing.

---

## 3. Cloudflare Worker Deployment

The Cloudflare Worker package lives in [`cloudflare-worker/`](file:///root/web-retro-arcade/cloudflare-worker/).

### Configuration (`wrangler.toml`)
```toml
name = "neon-retro-arcade-worker"
main = "src/index.ts"
compatibility_date = "2024-10-01"
compatibility_flags = ["nodejs_compat"]

[vars]
TWITCH_CHANNEL_NAME = "NeonArcadeLive"
SIMULATION_MODE = "auto"

[durable_objects]
bindings = [
  { name = "STREAM_COORDINATOR", class_name = "StreamCoordinator" }
]

[[migrations]]
tag = "v1"
new_classes = ["StreamCoordinator"]
```

### Required Secrets
To connect your real Cloudflare Stream trial and Twitch channel, configure these secrets in Cloudflare:

```bash
cd cloudflare-worker

# 1. Cloudflare Account ID & Stream API Token
npx wrangler secret put CLOUDFLARE_ACCOUNT_ID
npx wrangler secret put CLOUDFLARE_STREAM_API_TOKEN

# 2. Twitch Stream Key (from twitch.tv/creatorcamp/en/stream-key/)
npx wrangler secret put TWITCH_STREAM_KEY

# 3. Deploy the worker
npx wrangler deploy
```

### Automatic Simulation Mode
If secrets are not configured or when running offline in development, the worker and client automatically enter **Simulation Mode**:
- Full WebSocket queue handoff logic works locally.
- Standby and promotion states function without external API credentials.
- Quad arena testing can be previewed using the **Simulate 4 Active Players** toggle.

---

## 4. Endpoints Reference

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api/stream-room/ws` | `WS` | WebSocket connection for real-time presence, queue state, and quad-sync |
| `/api/stream-room/state` | `GET` | Returns current room state (active streamer, queue count, quad mode) |
| `/api/stream/whip-session` | `POST` | Provisions Cloudflare Stream WHIP session with Twitch RTMP output |
| `/health` | `GET` | Worker health status and credential verification |
