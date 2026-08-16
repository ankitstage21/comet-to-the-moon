# Comet — X-Lows: To The Moon — Design Record

A 3D-scrolling one-page concept launch site for Comet's moon-themed X-Lows
("Blue Ice" colorway, ₹5,899, UK 3–12). Built 2026-08-14 via the scroll-3d
pipeline. Concept/portfolio piece — not affiliated with Comet (wearcomet.com);
disclaimer shown in the site footer.

## Palette — "Lunar Blue Ice"

| Token | Hex | Use |
|-------|-----|-----|
| bg (deep space) | `#070b14` | Page + section backgrounds |
| accent (Blue Ice) | `#9fc2e8` | CTAs, highlights, rim lights, ring |
| surface (moon grey) | `#c9ced8` | Stat numbers, lunar surfaces |
| text (moonlight) | `#eef1f6` | Headlines, body |
| muted (crater blue) | `#3d5573` | Secondary accents, progress gradient |

Fonts: **Space Grotesk** (display/HUD), **Inter** (body). Loaded from Google Fonts.

## Sections (plan vs. build)

| # | id | Nav | Planned technique | Built technique | Deviation |
|---|----|-----|-------------------|-----------------|-----------|
| 1 | `launch` | Launch | scroll-cinematic (orbit) | scroll-cinematic (orbit) | — |
| 2 | `descent` | Descent | scroll-cinematic (descent) | scroll-cinematic (descent) | — |
| 3 | `moonwalk` | Moonwalk | scroll-world (procedural) | scroll-world (procedural) | — |
| 4 | `details` | Details | hybrid-2d3d (moon object) | hybrid-2d3d (moon object) | — |
| 5 | `explore` | Explore | click-navigate (4 waypoints) | click-navigate (4 waypoints) | — |
| 6 | `gravity` | Gravity | physics-play (low-gravity) | physics-play (low-gravity) | — |
| 7 | `get-them` | Get Them | cursor-trail (stardust CTA) | cursor-trail (stardust CTA) | — |

Zero plan deviations. Both Higgsfield clips rendered on the first attempt.

## Product-accuracy fix (2026-08-16)

User review: the generated shoe was a generic pale-blue low-top, not the real
X-Low "To The Moon" (white/ice body, dark starfield-dot panels, white
four-point comet star logo, sky-blue laces, silver COMET heel tab, blue camo
outsole). Fix: imported the actual product photos from wearcomet.com's Shopify
CDN into Higgsfield as reference images and regenerated both keyframes and both
clips with the references attached ("keep every design detail identical").
Copy updated to match the real shoe (no more "Blue Ice suede / gum-cream sole");
physics mini-model recolored (dark panel, blue laces/sole). Second generation
round: ~112 additional credits.

## Generated assets

- Keyframe 1 (hero): nano_banana_2, job `8a4f45e1…` — sneaker floating over lunar
  surface, Earth rising.
- Keyframe 2 (descent): nano_banana_2 with keyframe 1 as identity reference, job
  `83711d78…`.
- Clip 1 (launch): seedance_2_0, 1080p 6s orbit, job `8045f0db…` → 179 frames
  (`frames/launch/`, 19 MB @1600px q88).
- Clip 2 (descent): seedance_2_0, 1080p 6s touchdown + dust, job `9259265a…` →
  179 frames (`frames/descent/`, 27 MB @1600px q88).
- Source clips kept in `clips/`.

## Architecture

Zero-build static site: `index.html` + `styles.css` + engines
(`choreography.js` shared helpers, `scroll-cinematic.js` canvas scrub + Lenis
owner, `scroll-world.js` lunar terrain, `hybrid-2d3d.js` inline moon,
`click-navigate.js` sneaker tour, `physics-play.js` cannon-es at g=1.62,
`cursor-trail.js` stardust pool). Section registries live inline in
`index.html` (`SCRUB_SECTIONS`, `WORLD_SECTIONS`, `HYBRID_SECTIONS`,
`EXPLORE_SECTIONS`, `PHYSICS_SECTIONS`, `TRAIL_SECTIONS`). CDN deps: Lenis
1.3.21, Three.js 0.149 (classic build for the `THREE` global), cannon-es
0.20.0 (ESM republished onto `window.CANNON` via the `cannon-ready` event).

`prefers-reduced-motion` collapses every pinned section to 100vh with a static
pose. Mobile: hotspot tour and physics drag work via touch; cursor trail
degrades to ambient drift; hud-nav collapses below 700px.

## Verification (2026-08-14, local)

- All 7 engines initialize; zero console errors.
- Scrub proven by pixel sampling: launch FRAME 090/179 mid-scroll, descent
  draws at 85% progress; preloader gates and releases.
- Moonwalk WebGL renders (readPixels non-background); physics settles under
  lunar gravity after 90 manual steps; explore hotspots tween camera + update
  captions; CTA links to the wearcomet.com product page.
- Run locally: `python3 -m http.server 4173 --directory ~/comet-to-the-moon`

## Polish pass (2026-08-14, after first review)

- **Overlay-centering bug fixed in all three copy-driven engines** — they wrote
  `transform: translateY(...)`, clobbering the CSS `translate(-50%,-50%)`; copy
  rendered half off-screen. Now they compose both.
- **Moonwalk relit as night-side moon**: darker terrain (`#565e6e`), low-angle warm
  key at 0.85, cool ambient; stars/Earth excluded from fog (fog was swallowing
  both); Earth is now a flat self-lit `#6ea3ec` marble with an additive glow.
- **Explore rebuilt on real footage**: the procedural primitive sneaker read as
  blobs. The tour now tweens through the launch clip's 179 orbit frames —
  UPPER=25, LACES=70, SOLE=115, HEEL=155 — with shortest-wrap easing and a slow
  idle turntable between clicks. Photoreal, zero extra credits.
- **Gravity room**: starfield backdrop, accent rim light, better camera framing,
  spawns lowered out of the headline zone, and a properly proportioned mini
  X-Low (layered sole, toe cap, collar, laces, accent heel tab).
- **Details**: moon object exposure corrected; "FEELS LIKE" stat now 16% G (the
  counter's toFixed(1) rounded 0.16 to 0.2).

## Deploy

Cloudflare Pages deploy: see final build report (skipped if no
`CLOUDFLARE_API_TOKEN`/`CLOUDFLARE_ACCOUNT_ID` in environment).
