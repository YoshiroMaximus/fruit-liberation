# 🍊 Fruit Liberation

A fast, modern, installable map of the world's edible plants — built on the
[Falling Fruit](https://fallingfruit.org) database. Walk down the street, glance
at your phone, and see the apple, orange, and lemon trees around you. Filter by
fruit, save the good spots, and build a walking route to go pick them up.

This is an independent, open client that aims to be a faster, more app-like
alternative to the official site — a real PWA that works offline and feels
native on a phone.

---

## ✨ Features

- **Google-Maps-style map** powered by MapLibre GL (GPU vector rendering) with a
  free OpenFreeMap basemap — no API keys, no billing.
- **Smart density:** server-side **clusters** when zoomed out, individual
  **fruit markers** (colored + labeled per species) when zoomed in.
- **Filter by fruit:** quick-pick chips (apple, orange, lemon, fig…) plus search
  across the full **4,500+ type** catalog, with multilingual names.
- **Tap a spot** for a rich detail sheet: species, address, **season strip**,
  latest ripeness, photos, reviews, and access notes.
- **Save spots** on-device (works offline, no account) — or sign in with your
  Falling Fruit account to sync them to a server list across devices.
- **Build a route:** nearest-neighbor ordering from your location → one tap opens
  a multi-stop **walking route** in Google Maps or Apple Maps.
- **"Ripe right now"** filter on your saved spots (built from each spot's season),
  with a per-spot ripe badge and a season-aware route.
- **Contribute** (signed in): add a new spot with a pan-to-place crosshair,
  type/season/access details, and an optional first sighting + photo; leave a
  note / mark a spot ripe right from its detail sheet.
- **Live location** tracking for foraging on the move.
- **Full PWA:** installable, offline app shell, cached catalog + basemap tiles,
  light/dark themes that follow the system.
- **Cloudflare-native:** static SPA + a Pages Function that edge-caches and
  proxies the API (key stays server-side).

## 🧱 Tech stack

| Concern        | Choice                                              |
| -------------- | --------------------------------------------------- |
| Framework      | React 18 + TypeScript + Vite 6                      |
| Map            | MapLibre GL JS + OpenFreeMap vector tiles           |
| State          | Zustand (persisted to localStorage)                 |
| Storage        | IndexedDB (type catalog) via `idb-keyval`           |
| PWA            | `vite-plugin-pwa` (Workbox)                         |
| Geocoding      | OpenStreetMap Nominatim (place search)              |
| Hosting        | Cloudflare Pages + Pages Functions                  |

## 🏗️ Architecture

```
Browser (SPA)
  │  fetch /api/*            (same-origin — no CORS, no key in bundle)
  ▼
Cloudflare Pages Function   functions/api/[[path]].ts
  │  injects x-api-key, edge-caches GET clusters/locations/types
  ▼
Falling Fruit API           https://fallingfruit.org/api/0.3/*
```

In local dev, Vite's dev server plays the role of the Pages Function: it proxies
`/api/*` to the Falling Fruit API and injects the key (see `vite.config.ts`).

**Map data strategy** (mirrors the official app, with a faster renderer):
- zoom `< 14` → `GET /clusters` (counts per quadtree cell)
- zoom `>= 14` → `GET /locations` (individual points in the viewport)

Names, emoji, and per-species marker colors are resolved entirely client-side
from the cached `/types` catalog, so markers render instantly and offline.

> Note: the API also exposes an undocumented `/tiles/{z}/{x}/{y}.pbf` vector-tile
> endpoint, but it is **not functional in production** (`relation "tiles" does
> not exist`), so we use clusters + locations instead.

## 🚀 Getting started

```bash
npm install
npm run dev          # http://localhost:5173
```

No configuration is required — the app falls back to the public Falling Fruit
production API key. To use your own key, copy `.env.example` to `.env` and set
`FF_API_KEY`.

Other scripts:

```bash
npm run build        # typecheck + production build to dist/
npm run preview      # preview the built site
npm run typecheck    # tsc only
```

## ☁️ Deploy to Cloudflare Pages

The repo is configured for Cloudflare Pages with a Pages Function (`functions/`)
that proxies and edge-caches the API.

### Option A — Git integration (recommended)

1. Push this repo to GitHub/GitLab.
2. In the Cloudflare dashboard: **Workers & Pages → Create → Pages → Connect to Git**.
3. Build settings:
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
4. (Optional) **Settings → Variables and Secrets** → add `FF_API_KEY` if you
   have your own key.
5. Deploy. Every push redeploys automatically.

### Option B — Direct upload with Wrangler

```bash
npm install -g wrangler   # or use npx
wrangler login
npm run pages:deploy      # builds, then `wrangler pages deploy dist`
```

To set your own API key as a secret:

```bash
npx wrangler pages secret put FF_API_KEY
```

The `functions/` directory is auto-detected and deployed alongside the static
site; `/api/*` is served by the function, everything else by the SPA.

## 🌍 Attribution & responsible foraging

- Location data © [Falling Fruit](https://fallingfruit.org) and its contributors.
- Basemap © [OpenFreeMap](https://openfreemap.org) / © [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors.
- Place search © OpenStreetMap Nominatim.

Forage responsibly: only pick where you have permission, correctly identify
anything before eating it, and leave plenty for other people and for wildlife.

## 🗺️ Roadmap / not yet included

- Edit/delete your own spots and reviews from the app.
- Anonymous contributing (would need reCAPTCHA v2 in the add flow; today
  contributing requires sign-in, which skips the captcha).
- Whole-map "ripe now" (the list/cluster API has no season field, so today this
  is scoped to saved spots, whose season is captured on save).
- Self-hosted Protomaps basemap on Cloudflare R2 (optional speed/offline upgrade).

## License

MIT — see [LICENSE](./LICENSE).
