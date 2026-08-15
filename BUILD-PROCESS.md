# Comet "To The Moon" — Full Build Process

How the 3D-scrolling launch page for Comet's X-Lows "To The Moon" sneaker was built
(2026-08-14, one session). Live locally at `localhost:4173`, source in
`~/comet-to-the-moon`. Total AI generation cost: **112 Higgsfield credits**.

---

## Phase 1 — Research the product

Input was one line ("moon-themed shoes, make a 3D scrolling site") plus the product
URL. First step: fetch and analyze the wearcomet.com product page. Extracted:

- Product facts: X-Lows "To The Moon" = the **Blue Ice** colorway, ₹5,899 MRP,
  UK 3–12 (EUR 35.5–46), "NEW LAUNCH" badge, sold-out variants (scarcity signal).
- Brand voice: playful cosmic streetwear — "Hello, Cometeer", colorways named
  Moonshadow / Neptune / Starburst / Armstrong. No tech-spec talk.
- The page itself was a standard Shopify layout — nothing to clone structurally,
  so the site was planned from the product, not the reference.

Decision made here: generate all visuals with Higgsfield rather than scraping
Comet's photography — cleaner legally, and the moon theme demands scenes that
product photos don't have.

## Phase 2 — Plan the site (director step)

The scroll-3d-director skill turned the brief into a 7-section plan, one technique
per section so the page isn't the same trick seven times:

| # | Section | Technique | 3D treatment |
|---|---------|-----------|--------------|
| 1 | Launch | scroll-cinematic | Generated orbit clip, scroll-scrubbed canvas |
| 2 | Descent | scroll-cinematic | Generated touchdown clip, scroll-scrubbed |
| 3 | Moonwalk | scroll-world | Real-time Three.js lunar terrain fly-through |
| 4 | Details | hybrid-2d3d | Flat editorial specs + inline rotating moon |
| 5 | Explore | click-navigate | Hotspot product tour |
| 6 | Gravity | physics-play | cannon-es playground at g = 1.62 m/s² |
| 7 | Get Them | cursor-trail | Stardust particles + CTA |

Palette derived from the colorway: deep space `#070b14`, Blue Ice accent `#9fc2e8`,
moon grey `#c9ced8`, moonlight text `#eef1f6`, crater blue `#3d5573`. Fonts:
Space Grotesk + Inter. Plan + credit estimate (~54/clip) was approved before any
generation; the user opted in to a second clip (descent) at plan review.

## Phase 3 — Generate the hero footage (the only credits spent)

The "3D" in the two hero sections is pre-rendered video scrubbed by scroll — the
More Nutrition technique, with Higgsfield replacing the 3D artist:

1. **Keyframe 1** (nano_banana_pro → nano_banana_2, 16:9): the Blue Ice low-top
   floating over the cratered lunar surface, Earth rising behind, rim-lit.
2. **Keyframe 2**: same shoe descending toward the surface — generated **with
   keyframe 1 passed as a reference image** so the product identity stays locked
   across both clips. This is the identity-lock trick: never generate the second
   angle from text alone.
3. **Clip 1** (seedance_2_0, 1080p, 6s, keyframe 1 as `start_image`): "smooth
   seamless 360-degree orbit, one complete revolution, stays centered, no cuts."
4. **Clip 2** (same model, keyframe 2 as start): slow descent + touchdown with a
   slow-motion dust plume.

Both clips rendered on the first attempt — no moderation retries. Prompts always
demand *continuous motion, no cuts*, because a cut looks broken when scrubbed
backward.

## Phase 4 — Slice clips into scrub frames

Each finished clip went to a background agent running the ffmpeg pipeline while
the main session kept building:

- `extract-frames.sh clip.mp4 frames/<section> 180` — computes fps from the
  clip duration to hit ~180 frames (actual: 179 each).
- `compress-frames.sh frames/<section> 1600 88` — 1600px wide, JPEG q88
  (launch: 19 MB, descent: 27 MB).

The site preloads every frame behind a loader, then draws
`frames[floor(scrollProgress × 179)]` to a canvas. Scrolling = playing the video.

## Phase 5 — Build the sections (one engine per technique)

Zero-build static site: `index.html` + `styles.css` + seven small JS engines that
coexist through shared conventions — one Lenis instance (`window.__lenis`), shared
helpers (`choreography.js`: progress math, DPR cap, reduced-motion check), and
per-engine config arrays in the HTML (`SCRUB_SECTIONS`, `WORLD_SECTIONS`,
`HYBRID_SECTIONS`, `EXPLORE_SECTIONS`, `PHYSICS_SECTIONS`, `TRAIL_SECTIONS`).
Engines skip any section whose element is missing, so they compose freely.

- **Launch / Descent** — canvas scrub + overlay copy lines that fade over
  per-line scroll windows (`data-in`/`data-out`), telemetry corners, progress bar.
- **Moonwalk** — procedural Three.js: cratered terrain (vertex-displaced plane:
  rolling noise + cosine crater bowls with raised rims), 1,800-star dome, shaded
  Earth, fog for depth, camera gliding forward with low-gravity bob.
- **Details** — the one deliberately flat section (normal document flow, no
  pinning) so the page breathes: specs copy, count-up stats, colorway chips, and
  an inline auto-rotating cratered moon with a comet circling its ring.
- **Explore** — hotspot tour (see Phase 7 — this section got rebuilt).
- **Gravity** — cannon-es world with `gravity: (0, -1.62, 0)` — actual lunar
  gravity. Raycast drag, velocity-sampled throw on release, invisible walls so
  nothing flies off-scene. cannon-es is ESM-only: loaded via a module script that
  republishes onto `window.CANNON` and fires a `cannon-ready` event the engine
  waits for.
- **Get Them** — fixed-pool 2D-canvas stardust trail (pre-allocated particles,
  nothing allocated per frame), CTA to the real product page, disclaimer footer.

Every section has a reduced-motion fallback (static pose, 100vh, no pinning) and
a touch fallback (ambient particle drift, tap-driven tour, touch drag).

## Phase 6 — Verify inside a frozen pane

The preview pane runs `document.hidden = true`, which freezes rAF and
IntersectionObserver — animations never advance on their own. Verification
workarounds (all reusable):

- Drive engines manually: `__scrubs/__worlds/__physics[i].update()` after
  setting scroll, then read pixels or screenshot.
- **Screenshots blank when the page is scrolled** — shift content instead with
  `body.style.marginTop = -offsetpx` and stay at scrollY 0.
- WebGL `readPixels` has a bottom-left origin (a "sky" read at y=0.75 means
  upper quarter — got burned once).
- setTimeout is throttled to ~1s in hidden panes — settle physics with a
  busy-wait between `update()` calls, not awaited sleeps.
- Force `.reveal` classes and stat counters manually since IO never fires.

## Phase 7 — The review round (user: "only 2 sections look good")

The two cinematic sections landed; the procedural ones didn't. Diagnosis by
screenshotting every section, then five fixes:

1. **Site-wide overlay bug**: engines wrote `el.style.transform =
   "translateY(...)"`, clobbering the CSS `translate(-50%,-50%)` centering —
   headlines rendered half off-screen in three sections. Fixed by composing both
   transforms. *(Template bug worth upstreaming.)*
2. **Moonwalk was an overlit white blob-scape**: relit as night-side moon (dark
   terrain `#565e6e`, low warm sun 0.85, cool ambient) — and the scene fog was
   literally swallowing the stars and Earth (both beyond the fog far plane).
   `fog: false` on their materials brought the sky back.
3. **Explore's procedural sneaker read as white blobs** — the big rebuild.
   Scrapped the primitive 3D model; the tour now tweens through the **real orbit
   footage**: waypoints map to frames (UPPER=25, LACES=70, SOLE=115, HEEL=155),
   clicks ease along the shortest wrap-around path, idle turntable drifts between
   clicks. Photoreal, zero extra credits. Lesson: when photoreal footage exists,
   reuse it before modeling from primitives.
4. **Gravity room**: starfield backdrop, accent rim light, reframed camera,
   spawns lowered out of the headline zone, and a properly proportioned mini
   X-Low (layered sole, toe cap, collar, laces, accent heel tab).
5. **Details**: moon exposure corrected; "0.16 G" stat became "16% G" because the
   count-up animation rounds with `toFixed(1)`.

## Phase 8 — "Moonwalk is not properly rendered"

Second user report, real-browser-only bug: the world engine redrew **only on
Lenis scroll events**. Arriving via the nav anchor (native jump, no event) left a
stale first-frame canvas that looked broken. Fixes:

- World engine now renders every rAF frame (early-exits off-screen).
- Nav links route through `lenis.scrollTo(target, {duration: 1.4})` so section
  jumps glide instead of teleporting.
- Earth upgraded from flat disc to a radial-gradient canvas texture with cloud
  swirls, so it reads as a marble.

**Rule extracted: every scroll-driven engine must render from a continuous rAF
loop, never from scroll events** — events miss anchor jumps, mid-section
landings, and restored scroll positions.

## Final state

- 7 sections, all verified with pixel sampling + screenshots; zero console errors.
- 112 credits spent (2 keyframes + 2 × 1080p clips) vs ~108 estimated.
- Not yet deployed (no Cloudflare credentials on this machine) — GitHub Pages is
  the ready fallback, same recipe as luxeo-site.
- Full design record with plan-vs-build table in `DESIGN.md`.

## The recipe, distilled

1. Fetch the real product page first — copy written from real facts (price,
   sizes, colorway names) is what makes a concept page feel legitimate.
2. Plan all sections + costs up front; get one approval; build straight through.
3. Generate keyframe → clip, passing the keyframe as the video's start image, and
   the first keyframe as an identity reference for every later keyframe.
4. Demand continuous, cut-free camera motion in every clip prompt — scrubbing
   plays footage backward.
5. Mix techniques (scrub / real-time 3D / editorial / physics) so a one-pager
   doesn't repeat itself; keep exactly one flat section as breathing room.
6. Reuse generated footage everywhere you can (the frame-tour trick) before
   building procedural models — primitives rarely survive next to photoreal.
7. Verify sections by screenshotting each one, not by trusting engine-init
   checks — "it initialized" and "it looks good" are different claims.
8. Render loops on rAF, never on scroll events.
