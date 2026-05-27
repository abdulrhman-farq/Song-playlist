# Master Prompt — Ruwaida & Abdulrahman Wedding Playlist App

Build a premium, cinematic, fully client-side **Next.js 16 (App Router) + TypeScript + Tailwind CSS** web app that is both a real-time wedding music playlist controller **and** an editable wedding stationery piece for **Ruwaida & Abdulrahman · Friday 29 May 2026**. Deploys to Vercel as static prerender. Use Inter for body, Cormorant Garamond italic for display, Cinzel for tracked micro-labels, Italiana for ceremonial display, Tajawal for Arabic body, Markazi Text + Amiri for Arabic stationery typography. All five Google Fonts must be preloaded in `app/layout.tsx`.

## Identity & couple

- Couple Latin: **Ruwaida & Abdulrahman**
- Couple Arabic: **رويـدا و عبدالرحمن**
- Date: **Friday · ٢٩ مايو · 2026** (also rendered as `R · A · 29 . 05 . 2026`)
- Bride logo: a peach calligraphic ر/و monogram in watercolor cream — placed at `public/logo.png`, used in sidebar brand tile (38×38 rounded gold-bordered, focused at `center 35%`), hero artwork (centerpiece card with cream→ivory gradient, object-fit cover, focused 35%), timeline crest (multiply blend so the cream fuses with paper), and favicon

## Two visual systems, scoped

**Main app — dark cinematic music platform** (Spotify IA + Apple Music elegance + Linear smoothness + Arc gradients + luxury wedding storytelling). Tokens scoped in `:root`:

```
--bg-base:#050505  --bg-deep:#0a0a0a  --bg-panel:#121212
--bg-surface:#181818  --bg-raised:#242424  --bg-hover:#2a2a2a
--gold-200:#eed172  --gold-300:#e2bb42  --gold-400:#d4af37  --gold-500:#b8941d
--emerald:#22c55e  --emerald-glow:rgba(34,197,94,0.18)
--text:#fafafa  --text-dim:#d4d4d4  --text-muted:#a3a3a3  --text-faint:#737373
--danger:#f3a08a  --success:#88e0a4
--line-subtle:rgba(255,255,255,0.06)  --line-soft:rgba(255,255,255,0.1)  --line-gold:rgba(212,175,55,0.35)
```

Motion system: `--dur-fast:150ms`, `--dur-base:220ms`, `--dur-slow:360ms`, `--ease-out:cubic-bezier(0.22,1,0.36,1)`, `--ease-spring:cubic-bezier(0.34,1.56,0.64,1)`. Spacing scale 4-96px on `--space-*`. Z-depth tokens. Fluid `clamp()` type scale. Honour `prefers-reduced-motion`. Promote animated elements with `.gpu` (will-change + translateZ). Long lists use `.cv-auto` content-visibility.

Atmosphere: slow-drifting ambient gold/emerald blob layer behind everything (`.app-ambient`, 36s). Aurora conic-gradient spinning behind the hero artwork (22s). Hero artwork breathes (6s) and emits 3 staggered ring-pulses while a track plays. Active track row shows gold left-edge stripe + warm gradient (RTL-aware). Bottom player gains a now-playing halo and ambient gold haze only while playing. Premium progress bar with leading-edge white dot + double glow. Magnetic cursor spotlight on hero + composer cards via `useMagneticCursor` hook (RAF-coalesced). Text-cross blur fade on the now-playing title when the track changes.

**Timeline — quiet luxury wedding stationery**, scoped via `.wed-identity` class only (no global leak):

```
--w-paper:#FAF5EC  --w-ivory:#F4ECDF  --w-ivory-deep:#EBE0CE
--w-champagne:#E5D5BC  --w-champagne-2:#D9C5A5
--w-peach-soft:#F2D4BE  --w-peach:#E9B89A  --w-peach-deep:#D89274
--w-rose:#C97B5B  --w-blush:#F6DDCB
--w-ink:#3A2C20  --w-brown:#6B4A35  --w-brown-soft:#8C6A4F  --w-taupe:#A38A72
--w-gold:#B8956A  --w-gold-deep:#957251  --w-gold-soft:#D9BE96
```

Paper grain: layered radial-gradient watercolor washes + 127°/37° cross-hatch noise via `repeating-linear-gradient` at `mix-blend-mode:multiply`. Hairline inset frame at `inset:14px`.

## Architecture & layout

`AppShell` wraps everything. Persistent 280px frosted-glass `Sidebar` on desktop with backdrop-blur, slide-out drawer on mobile via menu icon. Sticky `BottomPlayer` at bottom (`--z-player`). Main scroll area between.

**Sidebar contents** (top→bottom):
1. Brand: 38×38 logo tile + "Maestro" eyebrow + "Ruwaida's Wedding" title
2. Nav: Home, Your playlist, **Timeline** (with R · A label, opens overlay)
3. Sections jump-list with track counts (scrolls to section header)
4. Playlist stats card (name, count, total time)
5. Action rows: Load samples, Import, Export, Test embeds, Clear all
6. Bottom: **Edit page** (admin only, gold), Sign out admin, language toggle (EN ↔ AR)

**PlaylistHero** (380-420px tall, cinematic):
- Layered backdrop: `.hero-gradient` (radial gold + emerald + ink) + aurora conic spin + vignette
- Centerpiece artwork card 240×240 (the calligraphic logo) with breathing animation, ring-pulses when playing, now-halo glow
- Eyebrow `wedding playlist · 29 · 05 · 2026` + countdown chip (e.g. "4 nights away") that glows when ≤3 days
- Couple Arabic name in Tajawal at `clamp(40px,6vw,84px)`
- Latin in Cormorant italic at `clamp(28px,3vw,36px)` gold-300
- Shimmer-text tagline "Cue the music for the night" / "نغمات السهرة"
- Stats line: track count · total time · upload count · YouTube count, separated by ornament petals
- Editable playlist name in italic, click to edit inline
- 64×64 gold play button + shuffle/repeat/more magnetic buttons

**Composer** (two cards side-by-side, magnetic spotlight on hover):
- `UploadPanel`: drag-drop zone, accepts `mp3 wav m4a mp4 mov webm`. **Video files extract audio client-side** via `lib/audioExtraction.ts` — fast path `AudioContext.decodeAudioData → WAV` for browser-decodable containers, fallback to `MediaRecorder` + `MediaElementAudioSource` + `MediaStreamAudioDestination` for the rest. Shows "Extracting audio…" inline. Zero new deps (no ffmpeg.wasm).
- `YouTubeAddPanel`: URL input + optional title input + gold Add button + helper "YouTube playback is via the official embedded player — audio is streamed, never downloaded"

**TrackList** with section grouping:
- Sections: Cocktail · ساعة الكوكتيل, Entrance · الزفّة, First Dance · الرقصة الأولى, Party · الحفلة by default
- Each section has its own play button + reorder/rename/delete
- Each track: drag handle, index→play swap on hover, 40px artwork (YouTube thumbnail or music icon), title (gold italic when active), source chip (upload/youtube/warn/trim), duration, hover-revealed edit/trim/delete buttons
- Equalizer bars when active
- Cross-section drag-drop adopts the target's section
- `next/prev` walks display order, not insertion order

**BottomPlayer** — frosted-glass sticky dock:
- 3-col grid: now-playing (52px artwork with halo + chips + position) | transport center (shuffle, prev, 46px gold play, next, repeat) + progress bar with leading-edge dot glow | volume + mute + autoplay toggles
- RTL swaps prev/next icons
- Spacebar toggles play
- Single shared `<audio>` element + single shared YouTube IFrame player via `lib/ytApi.ts` (one cached API loader promise)
- Per-track `startAt`/`endAt` trim enforced natively for YouTube (startSeconds/endSeconds) and via timeupdate guard for uploaded audio

## Features (all working, all persistent)

1. **Upload mp3/wav/m4a/ogg/aac/flac** → object URL + IndexedDB blob storage
2. **Upload video (mp4/mov/webm)** → client-side audio extraction → object URL
3. **YouTube link** → IFrame Player API embed (audio-only via off-screen `youtube-host`), oEmbed title fetch
4. **Drag-and-drop reorder** within section + across sections + into empty section header
5. **Inline rename** (double-click or edit button)
6. **Per-track trim modal**: mm:ss start/end inputs + "use current playhead" shortcuts; uploaded audio gets timeupdate guard, YouTube uses native startSeconds/endSeconds
7. **YouTube embed validator**: header button spawns hidden IFrames concurrency-3, detects error codes 100/101/150 → per-track red warn chip; modal lists OK / embedding disabled / removed / invalid / error
8. **Sections**: add/rename/delete/move-up/move-down with bilingual labels
9. **Autoplay / shuffle / repeat** toggles
10. **Export/import JSON** (YouTube tracks travel; uploaded blobs stay local)
11. **Bilingual EN/AR** with full RTL flip — sidebar moves to right in Arabic, prev/next icons swap
12. **Sample loader** drops in 3 wedding picks
13. **localStorage + IndexedDB** persistence (playlist name, tracks, sections, settings, audio blobs, language preference)

## Timeline overlay

Accessible from sidebar "Timeline · R · A" entry. Opens an immersive full-screen overlay (the overlay itself is the scroll container — iOS-safe pattern with `position:fixed body lock` to freeze background; `overscroll-behavior:contain` and `WebkitOverflowScrolling:touch` inside). `dir="rtl"` because the schedule is Arabic-primary.

**Card structure** (every text editable inline, every block removable in edit mode):
- Toolbar (outside the captured card): Edit mode, Add moment, Save as image (gold), Reset to default, × close
- The card with paper grain bg + hairline frame:
  - **Crest** (the calligraphic logo with `mix-blend-mode:multiply`) + `R · A · WEDDING` Cinzel eyebrow (removable)
  - **Date line**: Arabic side `الجمعة · ٢٩ مايو` (rose serif-ar) · Latin side `FRIDAY · 2026` (rose Italiana letter-spaced) — each independently editable; dots only render when both halves present
  - **Bride name** italic Cormorant `clamp(28px,8vw,42px)` peach-deep — defaults to `Ruwaida's Wedding`
  - **Groom name** Italiana letter-spaced (`& ABDULRAHMAN` — defaults to empty/hidden)
  - **Arabic couple line** Amiri bold `رويـدا و عبدالرحمن` (defaults to empty/hidden)
  - First ornament divider (3-line + diamond petal, removable)
  - **Appointments label** `المواعيد · APPOINTMENTS` Cinzel
  - **Timeline** with dashed gold center spine + alternating left/right rows:
    - Time (24px Italiana rose, letter-spaced 0.18em, ltr)
    - Petal dot (gold rose, custom path)
    - Role (15px brown-soft) and Name (20px bold ink) stacked
  - Add moment dashed-peach pill at bottom
  - Second ornament divider (removable)
  - Rings SVG (removable)
  - Footer message (15px serif-ar brown, multiline editable)
  - Signature block (removable): `عـــــروســـــكــــم` tracked + bride name 24px peach-deep bold + `R · A · 29 . 05 . 2026` Italiana
  - Edit hint at bottom

**Real schedule defaults** (seed v5):
- 4:30 PM · ميك اب ارتست · لينا البغدادية
- 5:30 PM · شعر · نبيله
- 6:00 PM · مساعدة العروس · فريق أيمان الربيع
- 6:00 PM · مصورة الجوال · شهد
- 7:00 PM · المصورة · نوف الظاهري
- 11:30 PM · الزفة

**Export as image**: `html-to-image` dynamic-imported on click. Awaits `document.fonts.ready` plus explicit `document.fonts.load()` for every face/size used (Tajawal, Cormorant italic 42px, Italiana, Cinzel, Amiri, Markazi Text) so Google Fonts are resident before snapshot. Target 2160px wide, 3× pixel ratio minimum, `transform:none` in capture, pinned width/height to natural rect. PNG output, native share via `navigator.share({files})` when available (WhatsApp/Stories), download fallback `wedding-timeline-29-05-2026.png`. Inline status: "Preparing image…" → "Saved" / "Couldn't save image".

## Site-wide Edit Mode

`EditModeProvider` wraps the entire app. Two-stage state: draft (in-progress) vs committed. Save promotes draft → localStorage. Cancel discards.

**Admin gate** — visit `?admin=1` once to flip `wedding-edit:admin` localStorage flag; `?admin=0` revokes. URL param stripped immediately. Without the flag the Edit UI is absent from the DOM. "Sign out admin" in sidebar clears the flag.

**Toolbar** — when editing, floating top-center pill: "Editing" label · Unsaved-changes indicator · Cancel · Save & Exit (gold, disabled when not dirty) · Reset (danger) · Exit. Cmd/Ctrl+S saves, Esc cancels.

**EditableText** component — drop-in for any `{t.someKey}`. Wraps in span/div with `contentEditable` only when editing. Blur commits to draft. Single-line Enter blurs. Renders gold dashed underline in edit mode, invisible otherwise.

**EditableBlock** component — wraps a section, adds a dashed outline + small × pill in edit mode. Hidden sections render as a slim "ghost" with a Show button.

**Currently wrapped**: Hero, Composer, FooterNote (block hide/show); EmptyState subtitle/title/hint (text). System is opt-in per text — wrapping more strings later doesn't break anything.

## Realtime sync (DB ready, integration WIP)

**Supabase project** (`czuruornutpvymdphbmn`): tables `wedding_playlists`, `wedding_sections`, `wedding_tracks` with row-level realtime publishing. Permissive RLS — anyone with the URL can read+write (the user explicitly wants "everyone sees it"). Single shared playlist seeded with UUID `00000000-0000-0000-0000-000000000001`. Client lives in `lib/supabase.ts`. Hook-up into PlaylistApp pending.

## Persistence keys

- `wedding-playlist:v1` — playlist + tracks + sections + settings
- `wedding-playlist:v1:timeline` — timeline doc (SEED_VERSION 5)
- `wedding-playlist` IndexedDB store `blobs` — uploaded audio
- `wedding-playlist:v1:lang` — EN/AR preference
- `wedding-edit:admin` — admin flag
- `wedding-edit:overrides:v1` — text overrides map
- `wedding-edit:hidden:v1` — hidden block list

## Component file layout

```
app/
  layout.tsx        — fonts, viewport, app-bg + app-ambient
  page.tsx          — renders <PlaylistApp/>
  globals.css       — all tokens, motion, surfaces, micro-interactions
components/
  AppShell.tsx          Sidebar.tsx           EditModeToolbar.tsx
  PlaylistHero.tsx      TrackList.tsx         TrackRow.tsx
  UploadPanel.tsx       YouTubeAddPanel.tsx   BottomPlayer.tsx
  EmptyState.tsx        Toast.tsx             ValidationModal.tsx
  TrimModal.tsx         Timeline.tsx          EditableText.tsx
  EditableBlock.tsx     PlaylistApp.tsx (orchestrator)
  icons.tsx (full SVG set + OrnamentMark + LogoMark)
lib/
  i18n.ts        — full EN/AR string tables
  storage.ts     — localStorage + IndexedDB
  timelineStorage.ts — Timeline doc storage
  youtube.ts     — ID parsing + oEmbed
  ytApi.ts       — shared IFrame API loader + embed validator
  audioExtraction.ts — video → audio fast/fallback paths
  format.ts      — fmtTime, uid, probeAudioDuration, titleFromFilename
  samples.ts     — sample tracks
  sections.ts    — default sections
  countdown.ts   — days-until-wedding helper
  useMagneticCursor.ts — cursor spotlight hook
  editMode.tsx   — EditModeProvider + hooks
  supabase.ts    — Supabase client + row types + fixed playlist UUID
types/
  index.ts       — Track, UploadTrack, YouTubeTrack, Playlist, PlaylistSection, TimelineDoc, TimelineEntry, PersistedSettings, ExportedPlaylist, Language
public/
  logo.png       — the bride's calligraphic monogram
```

## Deployment

Static prerender. Branch `claude/wedding-playlist-fullstack-OhbLa` → Vercel auto-deploys to <https://song-playlist-three.vercel.app/>. `npm run build` succeeds with `npx tsc --noEmit` clean. `.next/static/chunks ≈ 780K`. `npm install && npm run dev` for local on port 3000.

## Important constraints

- **No YouTube downloading** — official IFrame Player API only; surface "embedding disabled" / "removed" gracefully
- **First-touch autoplay** browser policy — surface a single user gesture before any auto-play attempt
- **RTL** must flip sidebar position, transport icon direction, and section label spacing
- **prefers-reduced-motion** disables all atmospheric animation
- **Wedding date** Friday 29 May 2026 18:00 Asia/Riyadh — used by countdown helper
