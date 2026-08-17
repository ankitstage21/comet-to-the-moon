# Comet X-Lows v2 — conversion build

A rebuild of the concept page as a **mobile-first landing page** that keeps the 3D
but subordinates it to a funnel. Same product, same generated assets, different
architecture.

Open: `http://localhost:4173/v2/index.html`
Dev: append `?forceboot=1` to skip lazy-load observers; `__tick()` runs one scroll
pass by hand; the ⚡ button opens a live weight/LCP HUD.

## The core idea

The two kinds of 3D do different jobs, so they get different treatment:

| | Job | Treatment | Weight |
|---|---|---|---|
| Interactive 3D (GLB) | Removes objections — "what does the sole look like" | Contained card, drag to rotate | **313 KB** |
| Cinematic scrub | Creates desire — mood, drop energy | One full-bleed section, diet frames | **664 KB** (mobile) |

The rule that makes it work: **interactive 3D earns trust at card size; footage earns
desire at full-bleed.** Swapping them fails — the GLB looks soft at hero scale, and
footage can't answer a buyer's questions.

## Weight budget (mobile tier, cold)

| Stage | Assets | Size |
|---|---|---|
| **First paint** | HTML + CSS + JS + poster.avif + fonts | **~88 KB** |
| Lazy · 3D layer | three 250 + loaders 26 + draco wasm 86 + model 313 | ~675 KB |
| Lazy · cinematic | 45 AVIF frames @720px | ~664 KB |
| **Total** | | **~1.4 MB** |

Original concept page: **46 MB behind a blocking loader**. ~32× lighter, and nothing
blocks first paint. Desktop tier swaps in 90 frames @1440px (~3.4 MB total).

Biggest single item is three.js itself (250 KB gz) — bigger than the model. A custom
tree-shaken build would cut that, if it ever matters.

## Tiering

`pickTier()` reads `navigator.connection`:

- `saveData` or 2g, or `prefers-reduced-motion` → **no sequence at all**; the poster
  is the hero and copy still animates on scroll
- 3g / narrow → 45 frames @720px
- 4g + ≥860px → 90 frames @1440px

Frames load in three passes: frame 0 first (paints immediately), then every 8th (so
scrubbing is usable), then the rest once the section is within 150% of the viewport.
`nearest()` falls back to the closest decoded frame, so scrubbing never stalls.
**There is no loader gate anywhere.**

## Rebuilding assets

```bash
./scripts/build-v2-frames.sh frames/launch v2/frames   # diet tiers + poster
npx @gltf-transform/cli optimize model.glb v2/assets/xlow.glb \
  --compress draco --texture-compress webp --texture-size 1024
```

The GLB came from Higgsfield `multi_image_to_3d` (3 generated studio views, ~35
credits) at 4.53 MB, compressed to 313 KB with no visible loss.

## Must be wired before this is real

1. **Waitlist form** — currently a local demo; nothing is sent or stored. Point it at
   Shopify/Klaviyo/WhatsApp Business. Size selection is deliberately captured because
   size demand is genuine signal for the restock run.
2. **Reviews & UGC** — the proof section is clearly-marked placeholders. Connect the
   store's real review source. Never ship invented reviews.
3. **Analytics** — `Track.sink()` logs to console and pushes to `dataLayer`. Swap for
   gtag/fbq. Events already fired: `page_ready`, `view_*` per section, `model_ready`,
   `model_first_drag`, `model_angle_*`, `cinematic_fill_start`, `size_selected`,
   `waitlist_complete`, `lcp`.
4. **Trust claims** — COD / 7-day returns / free shipping ₹999+ are placeholders;
   confirm against Comet's actual policies.

## Known limits

- The GLB is soft on fine detail: perforations read as texture, the star's silver
  outline is lost, and materials don't differentiate suede/mesh/metallic. Fine at
  card size, not at hero size.
- Colourway swapping needs one baked texture per colourway (~150–250 KB each,
  lazy on tap) — it is not a free material-variant toggle.
