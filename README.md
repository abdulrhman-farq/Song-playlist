# Wedding Playlist · رويـدا و عبدالرحمن

A bespoke, fully client-side wedding playlist app for **Ruwaida &
Abdulrahman · 29 · 05 · 2026**. Upload audio files (mp3 / wav / m4a)
or paste YouTube links, reorder the tracks, and play everything back
from one elegant cream-and-champagne stage.

Built with **Next.js (App Router) + TypeScript + Tailwind CSS**. No
backend, no API keys — everything lives in the browser.

## Features

- Bilingual UI (English + Arabic) with proper **RTL** layout, complete
  with Italiana, Cinzel, Cormorant Garamond, Amiri & Markazi Text
  typography
- Upload `mp3`, `wav`, `m4a` (or `ogg`, `aac`, `flac`) — object URLs in
  the browser
- Add tracks from **YouTube** links (embedded via the official IFrame
  Player API — videos are never downloaded)
- Per-track: title, source chip, duration, drag-and-drop reorder,
  rename (inline or double-click), delete
- Editable playlist name with elegant inline editor
- Built-in player: play / pause, next / previous, seek bar, volume,
  mute, **shuffle**, **repeat**, autoplay-next, spacebar shortcut
- Toast notifications for adds and exports
- **Persistence**: track metadata, playlist name, and settings in
  `localStorage`; uploaded audio blobs in **IndexedDB** so the
  playlist survives page reloads
- **Export / Import** playlists as JSON (YouTube tracks travel; uploaded
  blobs stay on the device)
- "Load samples" button drops in three timeless wedding picks
- Wedding aesthetic: paper-grain stage-card, gold-foil text, ornament
  dividers, equalizer bars on the active track, pulsing now-playing
  artwork

## Quick start

```bash
npm install
npm run dev
```

Then open <http://localhost:3000>.

The first run shows an empty stage with a "Start by adding music"
prompt. Click **Load samples** in the header to drop in three sample
YouTube tracks, or upload your own audio.

### Build & deploy

```bash
npm run build
npm start
```

The app is a regular Next.js project so it deploys cleanly to
**Vercel**, **Netlify**, **Cloudflare Pages**, or any host that runs
Node — push the repo and connect it.

## Project structure

```
app/
  layout.tsx          Root layout, loads design fonts
  page.tsx            Renders <PlaylistApp />
  globals.css         All design CSS (paper-bg, stage-card, btn-*, eq, …)
components/
  PlaylistApp.tsx     Orchestrator + playback engine
  Header.tsx          Action bar + couple branding + editable title
  AddPanel.tsx        Upload dropzone + YouTube form
  TrackItem.tsx       Single track row with drag & inline edit
  Player.tsx          Sticky bottom transport bar
  Toast.tsx           Flash messages
  icons.tsx           SVG icon set + ornament & logo marks
lib/
  i18n.ts             EN + AR string tables
  storage.ts          localStorage + IndexedDB helpers
  youtube.ts          ID extraction + oEmbed title fetch
  samples.ts          Sample playlist
  format.ts           fmtTime, uid, probeAudioDuration, …
types/
  index.ts            Track, Playlist, Exported* types
```

## YouTube playback — what is and isn't supported

This app **does not download** YouTube audio or video. Doing so
would violate YouTube's Terms of Service. Instead it:

- Extracts the 11-char video id from the URL you paste
- (Optionally) fetches the public title via YouTube's oEmbed endpoint
- Plays the video back through the official YouTube **IFrame Player
  API**, embedded off-screen so only the audio is heard

Because we use the official embed, a few things are out of our
control:

- Some videos are marked "embedding disabled" by the uploader. Those
  will load but refuse to play and YouTube will show its own message
- Mobile browsers may require a user gesture before allowing playback
  to start
- An internet connection is required to play YouTube tracks (uploaded
  files work fully offline)

## Persistence model

| Data                                  | Storage      |
|---------------------------------------|--------------|
| Playlist name + tracks + settings     | localStorage |
| Uploaded audio blobs                  | IndexedDB    |
| Language preference                   | localStorage |

When you export a playlist as JSON, only YouTube tracks are included —
uploaded blobs stay on the original device. Importing on another
device gives you back all your YouTube tracks; uploaded ones would
need to be re-uploaded there.

## License

MIT — make it your own.
