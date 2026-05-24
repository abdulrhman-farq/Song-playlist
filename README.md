# Wedding Playlist · قائمة تشغيل الزفاف

A modern, fully client-side web app for curating the soundtrack of a
wedding day. Drop in your own audio files (mp3 / wav / m4a) or paste
YouTube links, drag the tracks into the order you want, then play it
all back from a single elegant player.

Built with **Next.js (App Router) + TypeScript + Tailwind CSS**. No
backend required — everything lives in the browser.

## Features

- Bilingual UI (English + Arabic) with proper **RTL** layout
- Upload `mp3`, `wav`, or `m4a` files (object URLs in the browser)
- Add tracks from **YouTube** links (embedded via the official IFrame
  player — videos are never downloaded)
- Per-track: title, source type, duration, drag-and-drop reorder,
  rename, delete, move up/down
- Built-in player: play / pause, next / previous, seek bar, volume,
  autoplay next track, spacebar shortcut
- **Persistence**: track metadata in `localStorage`, uploaded audio
  blobs in **IndexedDB** so your playlist survives page reloads
- **Export / Import** playlists as JSON
- Wedding-themed design: soft gold / cream / black palette, glassy
  cards, gold gradient accents

## Quick start

```bash
npm install
npm run dev
```

Then open <http://localhost:3000>.

A small sample playlist of timeless wedding pieces (Pachelbel's
Canon, Mendelssohn's Wedding March, A Thousand Years) is loaded on
first run so the app is usable immediately. Clear it or import your
own at any time.

### Build & deploy

```bash
npm run build
npm start
```

The app is a regular Next.js project so it deploys cleanly to
**Vercel**, **Netlify**, **Cloudflare Pages**, or any host that
supports Node — push the repo and connect it.

## Project structure

```
app/                 Next.js App Router entry (layout, page, globals.css)
components/          UI components (Player, TrackItem, Header, …)
lib/                 storage, i18n, YouTube helpers, sample data
types/               Shared TypeScript types
```

## YouTube playback — what is and isn't supported

This app **does not download** YouTube audio or video. Doing so
would violate YouTube's Terms of Service. Instead it:

- Extracts the video id from the URL you paste
- Fetches the public title via YouTube's oEmbed endpoint
- Plays the video back through the official YouTube **IFrame Player
  API**, embedded off-screen so only the audio is heard

Because we use the official embed, a few things are out of our
control:

- Some videos are marked "embedding disabled" by the uploader.
  Those will load but refuse to play and YouTube will display its
  own message. Use a different URL if that happens.
- Mobile browsers may require a user gesture before allowing
  playback to start.
- An internet connection is required to play YouTube tracks
  (uploaded files work fully offline).

## Persistence model

| Data                         | Storage      |
|------------------------------|--------------|
| Playlist metadata + ordering | localStorage |
| Uploaded audio blobs         | IndexedDB    |
| Language preference          | localStorage |

When you export a playlist as JSON, only the metadata is included —
uploaded audio blobs stay on the original device. Importing a JSON
on another device will show those uploaded tracks as **Unplayable**
until you re-upload the matching files. YouTube tracks work across
devices.

## License

MIT — do whatever you'd like.
