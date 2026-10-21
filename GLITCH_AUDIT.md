# Glitch audit: DryLah website stability pass

Date: 21 Oct 2026. Checkpoint before changes: commit `7a8a721`.

**Scope.** This was a stability pass only. Design, copy, colours, typography, the 3D model, page structure and interactions are unchanged. The one visible change is that the scroll cue is now hidden on tablets (761 to 1023 px wide), where it covered the hero buttons. Phones already hid it.

## Stack

- Next.js 16 (App Router, static export, React 19 with Strict Mode), deployed to GitHub Pages.
- Three.js 0.186: a procedural model and a custom engine in `components/three/engine.ts`. There is no react-three-fiber and no post-processing.
- Lenis 1.3 for smooth scrolling.
- All animation is hand-written: requestAnimationFrame loops plus CSS transitions. There is no GSAP or ScrollTrigger.
- No skills in the environment applied. The only ones available were `find-skills` and `higgsfield-generate`.

## How problems were found

- **Dev server in the in-app browser.** I installed a probe before page scripts ran. It counted canvas buffer clears (every `canvas.width` write), WebGL contexts, Long Animation Frames (blocking time and attributed script), layout shifts with their source nodes, and uncaught errors and rejections.
- **Scroll tests.** Smooth and rapid scrolling in both directions through every story beat, plus refresh midway down a page and back/forward navigation.
- **Route changes during inertia.** Clicking links while Lenis was still coasting.
- **Repeated navigation.** 16 Home and Product route switches.
- **Automated suite.** `tests/e2e.mjs` (17 tests) runs against the production export. I ran it against both the pre-fix checkpoint build and the fixed build, so the failures below are measured, not inferred.

## Problems, causes, fixes and verification

| # | Glitch | Root cause | Fix | Verified by |
|---|---|---|---|---|
| 1 | **3D model blanks for a frame (flash or disappearance) during scrolling**, especially on mobile | `renderer.setSize()` was called on every window `resize` event. Writing `canvas.width` clears the drawing buffer even when the size is unchanged, and the browser can composite that empty buffer before the next render. Mobile URL-bar show/hide fires resize events constantly while scrolling | The engine watches its own canvas with a `ResizeObserver`. It applies a new size only at the top of a frame, immediately before rendering, only if the size really changed, and never to zero. Window resize listeners were removed from `Stage` and `Viewer` | Six synthetic resize events during a scroll: **6 buffer clears before, 0 after** (test "scrolling") |
| 2 | **Model flashes when quality adapts** on slower machines | Adaptive resolution called `setPixelRatio` and `setSize` *after* `render()`, so a cleared buffer could reach the screen | The resolution change is deferred to the next frame's size step, which is always followed by a render. Browser zoom and display DPR changes are handled the same way through a `resolution` media query | The probe showed 2 to 4 post-render clears per session before. After, clears happen only in the pre-render size step |
| 3 | **Page freezes for 300 to 650 ms mid-scroll** (scroll jumps forward when it unfreezes) at the exploded view and the water path | three.js compiles a material's shader program the first time it is drawn. Water, arrows, drops, glow and cutaway materials only become visible deep in the scroll story, so their compile landed mid-scroll. Long Animation Frame entries attributed 608 ms and 295 ms to the engine's `frame` | **Shader warm-up.** On its first frame (behind the intro card) the engine renders each key look once: exploded, labels and water path for the story; exploded and flow for the viewer. It then snaps back to the real starting look and scroll position, restoring turntable phase and time so the hero looks identical | Program count stays at 26 throughout a full scroll (no new compiles). Long-frame blocking during the story dropped from **608 ms to 0 to 131 ms** across five production runs (test threshold 200 ms) |
| 4 | **Clicking a link while the page is still coasting opens the next page part-way down, or at the bottom** | Lenis kept easing toward its old target after the route changed. That overrode the router's scroll-to-top, and stale page limits were kept | On every route commit (`useLayoutEffect` on the pathname), the pending glide is cancelled with `scrollTo(scrollY, { immediate, force })`. After the router positions the page, Lenis re-measures and adopts that position | Coast then navigate to /team: **landed at y=2663 before, y=0 after**. Back/forward restore and Lenis stay in sync (test "back and forward") |
| 5 | **Page scrolls behind the open mobile menu, then jumps on close** | The menu set `body { overflow: hidden }`, but Lenis was still running and kept moving its target | Lenis is stopped while the menu is open and restarted on close | Wheel input under the open menu: **page moved 132 px before, 0 after** (test "mobile menu") |
| 6 | **Reveal flash on load**: headings, cards and stats paint visible, vanish, then animate back in | Reveal styles are keyed to `html[data-motion='full']`, which was set in a React effect after hydration. The server-rendered first paint therefore showed final-state content | A tiny inline script in `<head>` sets `data-motion` (honouring reduced motion) before first paint | `data-motion` at DOMContentLoaded: **`null` before, `full` after** (test "first load") |
| 7 | **Counters flash their final number, then reset to 0** | `Counter` set 0 in `useEffect`, which runs after a paint | It now uses `useLayoutEffect`, which runs before paint | Code path. The counter sits inside a hidden reveal on first paint as of fix 6 |
| 8 | **Story progress lurches by the URL-bar height on mobile** | Progress used `innerHeight`, which changes as the mobile URL bar shows and hides. It was also read with `getBoundingClientRect()` every frame, after the engine's style writes, forcing a layout each frame | Stage geometry is measured only on change (`ResizeObserver`). The range uses the sticky viewport's own `100svh` height, and the frame loop reads only `scrollY` | Labels, exploded view and water path still land on the same beats (test "scroll story"). There are no forced layouts in the probe's script attribution |
| 9 | **Layout work every frame from the hero aura** | The aura's `width` and `height` were set per frame | It is fixed at 800 px and moved with `translate3d + scale` (compositor only), starting at `scale(0)` so it never shows before the first frame | Before/after screenshots are visually identical (`tests/evidence/compare.png`) |
| 10 | **Horizontal page shift when the intro card or the menu locks scrolling** (systems with classic scrollbars, such as Windows or a mouse on macOS) | `overflow: hidden` removed the scrollbar and the page widened by its width | `html { scrollbar-gutter: stable }` | No horizontal overflow at 8 viewport sizes and at 125% and 150% zoom (test "breakpoints") |
| 11 | **Refresh midway down the home page glides from the old position** | The browser restores scroll, the intro then resets to the top, and Lenis was initialised at the restored position | The intro also resets Lenis immediately. Together with fix 3, the engine starts at the real scroll position | Manual reload test in the dev browser. Inner pages keep their restored position (test "reload midway") |
| 12 | **Scroll cue covers the hero buttons on tablets** (761 to 1023 px) | At this width the hero docks to the bottom of the viewport, where the cue sits | The cue is hidden at 1023 px and below, matching the approved phone layout. The Explore button does the same job | The overlap assertion at every breakpoint (test "breakpoints") failed at 820×1180 before and passes after |
| 13 | **Hidden work: retry timers and continuously running loops** | `onWipe` fired `intro()` three times on timers. The marquee ran its rAF loop while off screen. The nav called `setState` every frame | The engine starts its intro on creation if the card has already wiped. The marquee loop runs only while visible (IntersectionObserver). The nav updates state only when the fold changes | Code review. The soak test shows no errors |
| 14 | **GPU contexts piling up across route changes** | Disposed renderers kept their WebGL context until garbage collection | `dispose()` releases the context once the canvas has left the page. It is skipped while the canvas is still attached, because Strict Mode reuses the same canvas and a lost context cannot be reacquired. A `webglcontextlost` handler pauses drawing until three restores it | 16 dev and 10 production Home↔Product switches: no WebGL warnings and the model still renders (test "repeated navigation") |
| 15 | Build hygiene: the site's `tsconfig` picked up the film projects in the same folder | `include: **/*.ts(x)` | `drylah_edit_scenes_04_05` and `video` excluded | `next build` is clean |

### Investigated and left as designed

- **Nav fold/unfold layout shifts.** Small, continuous shift entries (about 0.002 to 0.008 each) come from `.nav-shell` while the approved collapsible nav animates its width. This is the intended motion of a small fixed element, not an unexpected jump. Page CLS on load is **0** on every route.
- **Reveals, Lenis and the cursor under Strict Mode.** All effects already returned correct cleanups. Reveals uses one IntersectionObserver plus a childList MutationObserver; the engine's per-frame writes are styles and attributes, so they don't trigger rescans.
- **Fonts.** `next/font` self-hosts Archivo and IBM Plex Mono with metric-matched fallbacks, so there is no font-swap shift (CLS 0).
- **Images.** All `<img>` elements sit in fixed-aspect containers (`aspect-ratio` or explicit `width` and `height`), so lazy images never shift layout.
- **Old-build intro timeout.** One run against the old build timed out waiting for the intro at a breakpoint. It did not reproduce across all eight sizes on retry, so it is not claimed as a fixed bug.

## Production build

```
next build   ✓ Compiled successfully   ✓ TypeScript   13/13 static pages   (no warnings)
```

## Automated tests (`npm run build && npm run test:e2e`)

- **Setup:** 17 tests on the production export, using system Chrome (puppeteer-core) with real GPU WebGL.
- **Results:** the pre-fix checkpoint scored **12/17**. The fixed build scores **17/17** (latest output in `tests/last-run.txt`, full report in `tests/report.json`).
- **Coverage:**
  - First load and intro; hero and model rendering (pixel check).
  - Scroll story: exploded view, labels, water path and HUD.
  - Blocking frames and canvas clears during rapid scrolling.
  - Hotspot drawer; the hero CTA.
  - Route change during inertia; back/forward; repeated Home↔Product navigation with WebGL warnings checked.
  - Product viewer modes, zoom and hotspot.
  - Order form validation and demo submission.
  - Direct load of all 7 route types with zero console errors and failed requests, and CLS 0.
  - Reload midway; mobile menu scroll lock and navigation; reduced motion.
  - Breakpoints 1920×1080, 1440×900, 1366×768, 1024×768, 820×1180, 430×932, 390×844 and 360×800, plus 125% and 150% zoom: no horizontal overflow, hero inside the viewport and clear of the nav, cue clear of the buttons.
  - Two-minute soak of scrolling and navigation: no errors, heap within bounds.
- **Soak heap with forced GC:** 23 to 25 MB, then 24 to 49 MB on a second run. That isn't monotonic growth, and it is under the 60 MB budget.

## Evidence

- `tests/evidence/compare.png`: before and after at 1920 hero, 1440 labels and 1440 water path. The design is identical; only the model's idle spin angle differs.
- `tests/evidence/mobile.png`: 390, 360, 430 and 820 wide home, the research page, and the open mobile menu.
- `tests/screenshots/`: every breakpoint for home and research, both zoom levels, the story beats and the product water-flow view (regenerated on each test run).

## Remaining limitations

- **Hardware coverage.** Testing was on Apple-silicon Chrome, headless and in-app, plus mobile emulation (touch and DPR 3). Real iOS Safari and Android Chrome, Firefox and Windows GPUs were not available here. The fixes target behaviour those browsers share (canvas clearing, URL-bar resizes, scrollbar gutters), but they have not been observed there.
- **Shader warm-up time.** Warm-up moves all shader compiling to the first frame. On the home page this is hidden behind the intro card. On a client-side return to Home, the first frame takes the compile cost once while the hero is static, instead of mid-scroll.
- **Timing thresholds.** The blocking-frame threshold (200 ms) and heap budget (60 MB) are set for this machine. Slower CI hardware may need looser limits.
