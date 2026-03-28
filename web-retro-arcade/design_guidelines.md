# Design Guidelines: RetroArch Web Emulator

## Design Approach: Reference-Based (RetroArch + Gaming Platforms)

**Primary References:**
- RetroArch's iconic dark gaming interface
- Nintendo Switch UI fluidity
- PlayStation Store's visual hierarchy
- Steam's library organization

**Core Principle:** Blend authentic retro gaming nostalgia with modern web capabilities. Create an immersive gaming environment that feels both nostalgic and cutting-edge.

---

## Color Palette

**Dark Mode Foundation** (Primary):
- Background Base: `240 5% 6%` (near-black with cool undertone)
- Surface: `240 5% 10%` (elevated panels)
- Surface Elevated: `240 4% 14%` (cards, modals)
- Border Subtle: `240 5% 20%`
- Border Interactive: `240 4% 26%`

**Gaming Accent Colors:**
- Primary (Retro Purple): `270 70% 60%` (vibrant, nostalgic)
- Primary Hover: `270 70% 55%`
- Secondary (Cyan Glow): `190 80% 50%` (CRT screen aesthetic)
- Success (Green Console): `140 60% 50%` (save states, success indicators)
- Warning (Amber Alert): `40 95% 60%` (ROM format warnings)
- Danger (Red Power): `0 80% 60%` (delete, errors)

**Text Hierarchy:**
- Text Primary: `0 0% 98%`
- Text Secondary: `240 5% 65%`
- Text Muted: `240 4% 46%`
- Text On Accent: `0 0% 100%`

**Specialty Effects:**
- Scanline Overlay: `270 70% 60%` at 2% opacity (subtle CRT effect on game containers)
- Glow Effect: `190 80% 50%` with blur for active/hover states
- Gradient Overlays: Purple to cyan gradients for hero and featured sections

---

## Typography

**Font Stack:**
- **Primary (UI):** 'Inter', system-ui, sans-serif (clean, readable)
- **Display (Headers):** 'Space Grotesk', sans-serif (geometric, gaming feel)
- **Monospace (Code/Stats):** 'JetBrains Mono', monospace (technical data, file sizes)

**Scale & Usage:**
```
Hero Title: text-6xl lg:text-7xl font-bold (Space Grotesk)
Section Headers: text-3xl lg:text-4xl font-bold (Space Grotesk)
Card Titles: text-xl font-semibold (Inter)
Body Text: text-base (Inter)
Caption/Meta: text-sm text-secondary (Inter)
Code/Stats: text-sm font-mono (JetBrains Mono)
```

**Font Weights:**
- Headlines: 700 (bold)
- Subheadings: 600 (semibold)
- Body: 400 (regular)
- Emphasis: 500 (medium)

---

## Layout System

**Spacing Primitives:**
- Primary units: `2, 4, 6, 8, 12, 16, 24` (Tailwind scale)
- Consistent usage: `p-4` for tight padding, `p-8` for comfortable, `p-16` for spacious sections

**Container Strategy:**
- Full viewport: `w-full min-h-screen`
- Content containers: `max-w-7xl mx-auto px-4 lg:px-8`
- Game grid: `max-w-screen-2xl mx-auto`
- Modals/Dialogs: `max-w-4xl` for emulator settings, `max-w-2xl` for upload

**Grid Systems:**
- Game Library: `grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4`
- Featured Games: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6`
- System Selection: `grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3`
- Settings Layout: `grid-cols-1 lg:grid-cols-3 gap-8`

---

## Component Library

### Navigation
- **Top Bar:** Fixed header with logo, search, system selector, profile/settings
- **Sidebar (Optional):** Collapsible left panel for library navigation, favorites, recent games
- **System Tabs:** Horizontal scrollable tabs for NES, SNES, GB, GBA, Genesis, N64, PS1 (icon + label)

### Game Library
- **Game Cards:** 
  - Aspect ratio 3:4 (vertical box art)
  - Hover: scale-105 + cyan glow border + overlay with play button
  - States: Default, hover, selected (purple border), recently played (green indicator)
- **List View Alternative:** Compact rows with thumbnail, title, system badge, last played time
- **Empty States:** Illustrated "No ROMs" with upload CTA

### Emulator Interface
- **Game Canvas:** Centered, maintains aspect ratio, black letterboxing with subtle scanline effect
- **Control Bar:** Bottom overlay with play/pause, save state, load state, fullscreen, settings (auto-hide on inactivity)
- **HUD Overlay:** FPS counter, volume indicator (top corners, semi-transparent)

### File Upload
- **Drop Zone:** Dashed border, large icon, "Drag ROMs or click to browse" with supported formats (.nes, .smc, .gb, .gba, .bin, .iso)
- **Upload Progress:** Linear progress bar with file name and size
- **Validation Feedback:** Green checkmark for valid ROMs, red error for unsupported formats

### Settings Panel
- **Categories:** Video (resolution, filters), Audio (volume, mute), Controls (keyboard mapping, gamepad), Advanced (save directory, BIOS)
- **Input Components:** Sliders (volume), toggles (CRT filter, scanlines), key mapping buttons, dropdowns (resolution presets)

### Modals & Overlays
- **Save State Manager:** Grid of screenshot thumbnails with timestamp and quick load/delete
- **System Info:** Console specs, supported formats, example games
- **First-Time Setup:** Step-by-step wizard for uploading first ROM and configuring controls

### Data Displays
- **System Cards:** Large console icon, name, supported formats, ROM count badge
- **Statistics Dashboard:** Total games, hours played, favorite system (card layout with icons)
- **Recent Activity:** Horizontal scrolling carousel of recently played games

---

## Visual Treatments

### RetroArch-Specific Effects
- **CRT Scanlines:** Optional overlay with 2px horizontal lines at 3% opacity on game canvas
- **Pixel Perfect:** Sharp rendering with `image-rendering: pixelated` for game covers
- **Glow States:** Cyan `box-shadow: 0 0 20px` on interactive elements when active
- **Corner Notches:** Angled corners (clip-path) on system selector cards for futuristic gaming feel

### Animations
- **Hover Interactions:** `transition-all duration-200` for cards, buttons
- **Loading States:** Rotating game controller icon, pixel-style loading bar
- **Page Transitions:** Fade + slight scale (0.98 to 1) on mount

### Backgrounds
- **Hero Section:** Dark gradient from purple to black with subtle dot matrix pattern
- **Main App:** Solid dark background with occasional subtle grid overlay
- **Emulator Screen:** Pure black (#000000) for authentic display

---

## Images

**Hero Section:**
- Large hero image showcasing a collage of iconic retro game screenshots (Mario, Sonic, Zelda, Pokemon) with purple-cyan gradient overlay
- Dimensions: Full viewport width, 60-70vh height
- Treatment: Slight blur + dark overlay (40% opacity) for text readability
- Placement: Top of landing page with centered CTA "Start Playing" button

**Game Box Art:**
- Individual ROM cards display authentic box art/cover images
- Fallback: System logo icon on gradient background if no cover available
- Treatment: Sharp edges, subtle drop shadow, border on hover

**System Icons:**
- Console-specific icons for NES, SNES, Game Boy, etc. (vector graphics preferred)
- Style: Minimalist outlines in white, colored on selection
- Placement: System selector tabs, ROM card badges

**Background Patterns:**
- Subtle dotted grid pattern on hero and empty states
- Optional: Faint circuit board pattern for settings/technical sections

---

## Interaction Patterns

**Primary Actions:**
- Large "Play Now" buttons on game cards (gradient fill, prominent)
- Upload ROM: Drag-and-drop with visual feedback (border pulse, color change)
- Save/Load State: Quick access buttons with keyboard shortcuts (F5/F7)

**Secondary Actions:**
- Favorite toggle (heart icon, fills on click)
- Delete ROM (trash icon, requires confirmation)
- System filter (dropdown or tab navigation)

**Feedback:**
- Toast notifications for uploads, saves, errors (slide in from top-right)
- Inline validation on forms (green checkmark, red error icon)
- Loading spinners with game-themed animations (rotating D-pad)