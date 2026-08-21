# Build Prompt — Comet X-Lows "To The Moon" Giveaway Landing Page

> Copy everything below the line into your builder (Claude, v0, Lovable, Bolt, Figma Make).
> Fill every `«FILL»` before running it — those are decisions only you can make.

---

## 0 · FILL THESE FIRST

| Token | Value |
|---|---|
| `«DRAW_DATE»` | e.g. 30 September 2026, 18:00 IST |
| `«PRIZE_COUNT»` | e.g. 3 winners |
| `«IG_HANDLE»` | e.g. @wearcomet |
| `«TERMS_URL»` | link to full T&Cs |
| `«FORM_ENDPOINT»` | Shopify Forms / Klaviyo / Google Form / custom API |
| `«REGION»` | e.g. India only, 18+ |

---

## 1 · GOAL

A single-page giveaway landing page for **Comet**, an Indian streetwear sneaker
brand. The prize is the **X-Lows "To The Moon"** — a sold-out drop, which is the
whole hook: you cannot buy it, you can only win it.

**Primary conversion:** a completed giveaway entry (contact + UK size).
**Secondary:** social amplification via referral link and follow actions.
**Not a goal:** selling. There is no cart, no checkout, no add-to-bag anywhere.

Audience is mobile-majority Indian streetwear buyers arriving cold from Instagram.
Assume a mid-range Android on 4G. Every decision below serves that visitor first.

---

## 2 · TECH STACK & HARD CONSTRAINTS

- **Vanilla HTML + CSS + ES modules. No React, no build step.** The page must run
  from any static host by opening `index.html`.
- Three.js (v0.160, ESM via importmap) **only** for the product viewer. No other
  runtime dependency.
- **Performance budget — treat as a hard requirement, not a target:**
  - ≤ **120 KB** transferred before first contentful paint
  - ≤ **1.6 MB** total for the whole page on mobile
  - **No loading gate.** Never block the page behind a preloader. Content paints
    first; enhancements arrive after.
  - Everything below the fold is lazy-loaded via IntersectionObserver.
- Images: AVIF with JPEG fallback via `<picture>`. Explicit `width`/`height` or
  `aspect-ratio` on every image so cumulative layout shift stays at zero.
- Drive all scroll-linked animation from **one shared `requestAnimationFrame`
  loop**, never from `scroll` events — scroll events miss anchor jumps and
  restored scroll positions and leave stale canvases.
- Respect `prefers-reduced-motion`: no pinning, no auto-rotation, no parallax;
  static poses instead.
- Respect `navigator.connection.saveData` and `effectiveType`: on 2G/data-saver,
  skip the 3D model and any image sequence entirely and serve stills.

---

## 3 · DESIGN SYSTEM

**Palette** (CSS custom properties on `:root`)

| Token | Hex | Use |
|---|---|---|
| `--bg` | `#070b14` | page background (deep space) |
| `--bg2` | `#0d1424` | alternating section tint |
| `--ink` | `#eef1f6` | primary text |
| `--dim` | `rgba(238,241,246,.62)` | secondary text |
| `--accent` | `#9fc2e8` | CTAs, kickers, highlights (the shoe's ice blue) |
| `--accent-ink` | `#07101c` | text on accent fills |
| `--line` | `rgba(159,194,232,.18)` | hairline borders |
| `--win` | `#7fe0a0` | success / "you're in" state only |

**Type** — Google Fonts, `display=swap`, preconnect.
- Display: **Space Grotesk** 500/700 — headings, kickers, buttons, numerals.
- Body: **Inter** 400/500/600.
- Headings: `font-weight:700; letter-spacing:-.01em; line-height:1.05;`
  fluid sizing `clamp(1.6rem, 7vw, 2.6rem)`; hero `clamp(2.3rem, 12vw, 3.8rem)`.
- Kickers: 10px, `letter-spacing:.3em`, uppercase, `--accent`.

**Motion language** — restrained and fast. Fade-up on enter: 22px travel, 0.6s,
`cubic-bezier(.25,.1,.25,1)`, staggered 80ms. Buttons: 0.18s. No bounce, no
spring, no confetti except once on successful entry.

**Shape** — 999px pills for buttons and chips; 16px radius on cards and the
viewer; 1px hairlines, never heavy borders.

---

## 4 · ASSETS

**Do not hotlink anything.** Every asset is a local file in `assets/`.

Required, supplied by me:
- `assets/xlow.glb` — 313 KB Draco-compressed, WebP-textured 3D model of the shoe
- `assets/poster.avif` + `.jpg` — 1080px hero still (~55 KB)
- `frames/m/f_000…f_044.avif` — 45-frame 720px cinematic sequence (~664 KB)
- `frames/d/f_000…f_089.avif` — 90-frame 1440px sequence for desktop (~3.4 MB)

The shoe: white and ice-blue low-top, charcoal panels covered in tiny white
starfield dots, a **white four-pointed comet star** on the lateral side, sky-blue
flat laces, silver COMET heel tab, blue-and-white camo outsole. Any placeholder
you generate must respect these details.

---

## 5 · GIVEAWAY MECHANICS  ← the core of this build

**Entry (required, one submit):**
1. UK size, 3–12 — a 5×2 grid of pill buttons, single-select, required
2. Contact — WhatsApp number **or** email, at least one required
3. Consent checkbox — agree to `«TERMS_URL»`, required, unticked by default

On success the user gets **1 entry**.

**Bonus entries** — shown only *after* a successful entry, on the same screen,
as a checklist. Each is a link out plus a "Mark done" toggle. These are
self-declared and must be described as *pending verification*:
- Follow `«IG_HANDLE»` → +1
- Share to your story and tag us → +2
- Refer a friend → +2 per signup, via a unique referral link

**Referral link** — generate a short code client-side from the entry (e.g. 6
base36 chars), display it as a full URL with a copy button and native
`navigator.share` where available. A visitor arriving with `?ref=CODE` has it
stored and submitted with their entry.

**Entry counter** — show total entries only if the number is real, read from
`«FORM_ENDPOINT»`. **If you cannot fetch a real count, omit the counter
entirely.** Never display an invented or incrementing fake number.

**Countdown** — live `days : hours : minutes : seconds` to `«DRAW_DATE»`,
computed from a fixed ISO timestamp in IST. Under 24 hours it turns `--accent`
and the label changes to "CLOSING TODAY".

**Page states** — implement all five; drive from the countdown plus a config flag:
1. `pre` — "Entries open «DATE»", form disabled, notify-me instead
2. `live` — default; form active
3. `closing` — under 24h; countdown emphasised, urgency copy
4. `closed` — form replaced with "Entries closed — winners announced «DATE»"
5. `announced` — winners block. **Leave this as an empty, clearly-marked
   placeholder.** Do not invent winner names or handles.

---

## 6 · SECTIONS, IN ORDER

**1 · Header** — sticky, 56px, blurred `rgba(7,11,20,.82)` with hairline bottom.
Left: `COMET ✦`. Right: pill link "ENTER NOW" → `#enter`.

**2 · Hero** — one viewport, everything above the fold, no scrolling required to
understand the offer:
- `poster.avif` as an `<img>` with `fetchpriority="high"` — this is the LCP
  element and the only preloaded asset
- Flag pill: `GIVEAWAY · SOLD-OUT DROP`
- H1: `WIN THE X-LOWS` / italic accent line `To The Moon`
- Sub: "Sold out everywhere. «PRIZE_COUNT» pairs. One entry, thirty seconds."
- Countdown, compact
- Primary CTA: `ENTER THE DRAW` → `#enter`
- Trust row: `✓ Free to enter` · `✓ No purchase necessary` · `✓ «REGION»`
- Desktop ≥860px: two columns, copy left, image right. Mobile: image then copy.

**3 · Prize** — what they're actually winning. `--bg2` tint.
- The **interactive 3D viewer**: `xlow.glb` in a contained card,
  `aspect-ratio:4/3` mobile / `16/9` desktop, max-width 860px.
  Drag to rotate, slow idle auto-rotation until first interaction, four angle
  chips (SIDE / HEEL / INNER / SOLE) that tween the camera over ~600ms, and a
  RESET VIEW button. `touch-action:pan-y` so vertical scrolling still works when
  a finger starts on the model. Lazy-init at 120% rootMargin; on WebGL failure
  swap in the poster image silently.
- Spec list: colourway, signature, outsole, sizes UK 3–12 (EUR 35.5–46), and
  **retail value ₹5,899** — the prize's worth is the persuasion here.

**4 · Cinematic** — one full-bleed scroll-scrubbed sequence, 320vh tall with a
sticky 100vh stage. Tier-select frames from connection quality. Progressive
load: frame 0 paints immediately, then every 8th frame, then the remainder when
within 150% of the viewport; always draw the nearest decoded frame so scrubbing
never stalls. Two overlay lines fading over scroll-progress windows:
"SOLD OUT EVERYWHERE." / "EXCEPT RIGHT HERE."

**5 · How to enter** — three numbered steps, plain and scannable:
`01 Pick your size` · `02 Drop your WhatsApp or email` · `03 Share to multiply
your entries`. No decoration; this section exists to remove friction, not to
impress.

**6 · Enter** `#enter` — the form from §5. Max-width 520px. Large tap targets
(≥48px). Inline validation on blur, never on keypress. The submit button is the
widest element on the page.

**7 · Entered (replaces §6 on success)** — `--win` accent. "You're in." Show the
size and channel captured, the entry count so far *for this user*, the bonus
checklist, and the referral link with copy + share buttons. One confetti burst,
suppressed under reduced motion.

**8 · FAQ** — accordion, `<details>`/`<summary>`, no JS needed: who can enter,
when the draw happens, how winners are contacted, is it free, what if I already
own a pair, shipping.

**9 · Footer** — T&Cs link, privacy link, `«IG_HANDLE»`, and the line:
"No purchase necessary. Open to «REGION». See full terms."

**Sticky dock (mobile only)** — appears once the hero scrolls away, hides while
the form is on screen: prize name left, `ENTER` button right.

---

## 7 · FORM, DATA, VALIDATION

Submit `POST` to `«FORM_ENDPOINT»` as JSON:
```
{ size_uk, channel: "whatsapp"|"email", contact, consent: true,
  ref_code, own_code, entries_claimed, ts, utm: {...} }
```
- Validate: size selected; contact present and shaped correctly (Indian mobile
  `+91` 10 digits, or RFC-ish email); consent ticked.
- Errors appear beneath the field, `role="alert"`, plain language
  ("Add a WhatsApp number or an email") — never a raw validation string.
- Disable the submit button and show a spinner while in flight; re-enable on
  failure with a retry message. Never silently swallow a failed submit.
- Store the entry in `localStorage` so a returning visitor sees the entered
  state and their referral link rather than an empty form.
- If `«FORM_ENDPOINT»` is not yet configured, the form must **say so on the page**
  ("Demo — nothing is sent or stored") rather than pretending to succeed.

---

## 8 · INSTRUMENTATION

Push to `window.dataLayer` and expose a single `track(name, data)` so it can be
swapped for gtag/fbq in one place. Fire: `page_view`, `view_<section>` once each,
`countdown_state`, `model_ready`, `model_first_drag`, `model_angle_<n>`,
`cinematic_fill_start`, `size_selected`, `entry_submit`, `entry_success`,
`entry_error`, `bonus_click_<action>`, `referral_copied`, `lcp`.

---

## 9 · ACCESSIBILITY

Semantic landmarks; one `<h1>`. All controls keyboard-reachable with visible
focus rings (`outline:2px solid var(--accent)`). Size grid is a
`role="radiogroup"` with arrow-key navigation. Countdown updates via
`aria-live="polite"` at minute granularity, not every second. Contrast ≥ 4.5:1
for body text. The 3D viewer is decorative-plus: every fact it conveys is also
in the spec list as text.

---

## 10 · DO NOT

- **Do not invent social proof** — no fabricated entry counts, winner names,
  testimonials, review scores, or "1,204 people entered". If the real number
  isn't available, omit the element.
- **Do not hotlink** images, GIFs, or fonts from third-party sites.
- **Do not add a preloader** or any gate before content.
- **Do not exceed the budget** in §2. If a feature would break it, drop the
  feature and say so.
- **Do not imply a purchase improves the odds** — that changes the legal
  character of the promotion.
- **Do not ship the `announced` state populated** with placeholder winners.

---

## 11 · LEGAL — FLAG, DON'T GUESS

Prize promotions in India sit under real constraints (state lottery and prize
competition law, plus Instagram's own promotion rules if social actions are
involved). The page must carry: eligibility, entry window with timezone, number
of prizes, draw method, how winners are notified and by when, an unclaimed-prize
rule, and a statement that the promotion is not affiliated with or endorsed by
Instagram/Meta. **Generate these as clearly-marked placeholders and tell me to
have them reviewed** — do not draft final terms as though they are legally
sound.

---

## 12 · DELIVERABLES

`index.html`, `styles.css`, `app.js`, `assets/`, plus a short `README.md`
recording: measured transfer size at first paint and total, the tier logic, every
`«FILL»` still outstanding, and everything that must be wired before launch.
