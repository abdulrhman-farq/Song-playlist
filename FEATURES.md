# Wedding Playlist · Feature Catalog

Web app for **Ruwaida & Abdulrahman's** wedding (Friday · 29 May 2026). A single Next.js 16 React app with Supabase realtime sync, deployed on Vercel. Built mobile-first with a peach-on-warm-sepia premium aesthetic.

Live: <https://song-playlist-three.vercel.app>

---

## 1. Music Playlist (core)

- **Two source types**: YouTube (embed-only, never downloaded) and direct audio uploads (stored in Supabase Storage).
- **Real-time collaborative editing** via Supabase Realtime — every guest sees the same playlist update instantly.
- **In-track trim**: per-track `startAt` / `endAt` lets the DJ skip intros/outros without re-uploading.
- **Drag-and-drop reordering** of tracks and sections (HTML5 DnD) — works on desktop, falls back to up/down chevrons on touch.
- **Embedded YouTube validator** flags tracks that have been removed, made private, or have embedding disabled.
- **Audio "Clips Workbench"** (DJ merge tool): pick clips from uploaded tracks, set per-clip start/end, render into one continuous merged file.
- **Persistent player state**: volume, shuffle, repeat, autoplay all saved.
- **Bottom transport bar**:
  - Now-playing card with thumbnail + cross-fade
  - Play / pause / next / prev / shuffle / repeat / autoplay
  - Premium seek bar with peach progress fill
  - Volume slider
  - "Next up" preview line
  - **Collapse button** — minimises to a small floating pill (play + expand) so guests can free the screen for the playlist
  - Respects `env(safe-area-inset-bottom)` so it sits above the iOS home indicator and browser toolbars

## 2. Sections (playlist grouping)

- Tracks can be grouped into named sections (Cocktail, Entrance, Ceremony, First Dance, Party, etc.).
- **Sidebar jump list** with track counts per section; clicking scrolls smoothly to that section in the playlist.
- **Unassigned bucket** is surfaced automatically (its own muted entry in the sidebar) so loose tracks never get lost.
- **Bulk picker**: on the Unassigned block, a single dropdown moves *all* loose tracks into a chosen section.
- **Per-section toolbar**: play whole section, rename, duplicate, move up/down, delete.
- **Drag-to-reorder** sections via the section header grip.
- **Realtime sync** of section changes via Supabase channels (same as tracks).

## 3. Wedding-Day Timeline

- Full-screen modal listing appointments for the day (hair, makeup, photographer, entrance, etc.).
- Editable in admin edit mode: each row has time / role / name.
- **Wedding-stationery aesthetic** — distinct from the rest of the app: cream paper background, peach accents, Italiana display font, ornamental dividers.
- Pre-seeded with the couple's real schedule.
- "**Save as image**" export (uses `html-to-image` to produce a shareable PNG).
- Hidden blocks (crest, ornaments, signature) are toggleable.

## 4. Tasks (wedding to-do)

- Full-screen modal modeled after Google Tasks.
- Pre-seeded with the couple's real to-do list (15 open + 7 completed items).
- **Custom calendar + time picker** (peach-themed, not the native OS picker — matches the rest of the app exactly).
- **Chronological sort**: earliest-due first, undated → bottom, starred floats inside each group.
- **Completed section** is collapsible and sorts most-recent first.
- **Star/important** flag for priority.
- Inline title edit, due-date picker, delete confirmation.
- Stored as ISO datetimes internally, formatted as "Today, 8:00 PM" / "Tomorrow, 9:30 AM" / "Fri, 29 May at 11:30 PM" / "Due 3 days ago" in EN + AR.
- Past-due tasks render the chip in red.
- Original due date stays visible after completion (Google Tasks parity) plus a small "✓ Completed …" line.
- Persists to localStorage with seed-version migration.

## 5. Home At-a-Glance Recap

- Three clickable cards under the hero:
  - **Playlist** — track + section counts → scrolls to playlist
  - **Wedding Day** — date + first two timeline moments → opens Timeline
  - **To-Do** — open vs done counts + next 3 tasks (starred floats) → opens Tasks
- Each card refreshes on focus / visibility change so ticking a task elsewhere updates the recap.

## 6. Internationalisation

- **Full bilingual EN ↔ AR** with one-tap toggle in the sidebar.
- Direction-aware layout (`dir="rtl"` / `dir="ltr"`) — every component checks language for chevron direction, text alignment, etc.
- Seven self-hosted Google fonts via `next/font`: Inter, Cormorant Garamond, Cinzel, Italiana, Tajawal, Markazi Text, Amiri.
- Arabic-aware date / time formatting throughout.

## 7. Admin / Edit Mode

- Password-gated admin mode toggle.
- Every text label and image in the app is wrapped in `<EditableText>` / `<EditableImage>` / `<EditableBlock>` so the bride can change copy or replace images live without a code deploy.
- Edits persist to Supabase and broadcast to all viewers.

## 8. Wedding-Day "Lock" Mode

- One tap locks the app for the ceremony:
  - Hides the composer (upload + YouTube panels)
  - Hides destructive actions (Clear all, Delete)
  - Hides per-row affordances (rename, delete, drag, trim)
  - Hides the edit-page entry
- Designed so the laptop can be handed to anyone during the ceremony without risk of accidental damage.
- Visible "Locked for ceremony" badge in the sidebar.

## 9. PWA + Offline-First Shell

- `manifest.webmanifest` with maskable + standard icons, `viewport-fit: cover`, status-bar styling.
- Service worker (`/sw.js`) caches the shell so opening the app on the wedding day with patchy reception is still snappy.
- iOS "Add to Home Screen" + Android install banner both styled.
- `display_override: ["window-controls-overlay", "standalone"]` so installed Chrome/Edge gets the proper PWA chrome.

## 10. Realtime + Storage Backend

- **Supabase Postgres** stores playlists, sections, tracks, edits, timeline, and tasks.
- **Supabase Realtime channels** broadcast changes — `Live · synced` indicator in the sidebar shows live connection status with a pulsing peach dot.
- **Supabase Storage** for uploaded audio blobs with signed URLs.
- Soft-fails gracefully offline: edits queue locally, then re-sync on reconnect.

## 11. Import / Export

- **Export JSON** of the entire playlist (only YouTube tracks — upload tracks intentionally skipped to keep payloads small).
- **Import JSON** restores a playlist from a previous export.
- "Load samples" populates the playlist with curated demo tracks for first-time visitors.

## 12. Hero / Landing

- Animated cinematic hero with countdown to wedding day ("X days away" / "Today" / "Just married").
- Premium typography: bride's name in display italic, couple's Arabic name in Amiri, tracked-caps for the date.
- Hero artwork is editable (bride uploads her own monogram via edit mode).
- One-tap **primary Play** kicks off the first track in the playlist.

## 13. Visual System

- **Single peach accent** (`#d89274`) drawn from the bride's logo. All blues, greens, and emerald hues were removed; legacy `--gold-*` tokens alias to peach so old utility classes keep working.
- **Warm sepia background palette** (`#1a1310` → `#4a382a`) instead of pure black, so the peach feels native to the surface.
- **Aurora gradient** behind the hero rebuilt with five peach stops so monochrome still has depth.
- **Now-playing halo**, **progress-fill**, **chip borders**, **focus rings**, **drop indicators** — all peach.
- Glass-blur panels (`backdrop-filter: blur(28px) saturate(180%)`) for the sidebar, drawer, and modals.

## 14. Architecture / Engineering Notes

- **Next.js 16 App Router** + TypeScript strict + Tailwind CSS.
- Static prerender on Vercel; client-only modals lazy-loaded via `next/dynamic` with `ssr: false` to keep first-paint JS lean.
- **Self-hosted fonts** via `next/font/google` (no FOUT, no 3rd-party request on first paint).
- **Preconnect + DNS-prefetch** to `i.ytimg.com` so the first track thumbnail loads in <50 ms.
- **Memoised** `TrackRow` so a 100+ song playlist re-renders only the row that changed.
- **Drag-and-drop** uses HTML5 native DnD with a custom mime type (`application/x-playlist-section`) to distinguish section reorder from track reorder.
- **localStorage with versioned seeds** for Timeline + Tasks — bumping `SEED_VERSION` cleanly migrates everyone on next visit.
- **Date utilities** (`lib/dueDate.ts`) handle ISO ↔ display ↔ relative phrasing in both languages.

---

## Where an expert could add value

The build is solid as a single-event app, but a reviewer might suggest:

- **Guest RSVP + song requests** flow that feeds directly into the playlist (with moderation).
- **DJ console** mode: BPM, key, energy curve, crossfade timing across the night.
- **iCal / Google Calendar export** for the Timeline and Tasks (one tap → adds 15 events to the couple's phones).
- **Push notifications** for upcoming tasks (web push API + service worker).
- **Photo gallery** with face-clustered guest uploads (Supabase Storage + signed URLs).
- **Multi-language beyond EN/AR** (some guests may be French / Urdu speakers).
- **Print-ready PDF** of the timeline (vs current PNG export).
- **Voice memos** attached to a track ("dedicated by X to Y, play after the entrance").
- **Spotify / Apple Music import** to seed the playlist from existing libraries.
- **AI playlist suggestions** — given the timeline's vibe per section (cocktail / first dance), suggest tracks from a curated wedding catalog.
- **Accessibility audit**: ARIA labels are in place but a screen-reader pass + keyboard-only run-through would harden it.
- **Analytics for the bride**: how many guests opened the app, which tracks got the most plays, what songs were skipped, etc.
- **Bilingual SEO** + Open Graph cards in both languages.
- **End-to-end test coverage** (Playwright) for the lock-mode + realtime sync flows.
- **Rate-limiting + abuse protection** on the realtime channel so a malicious guest can't wipe the playlist.
