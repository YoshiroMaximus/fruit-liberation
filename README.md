# Fruit Liberation

A fast, installable map for finding edible plants near you, using data from [Falling Fruit](https://fallingfruit.org).

The idea is simple: open the app, look around your area, and see nearby fruit trees or edible plants. You can filter by fruit, save good spots, and build a walking route to visit them.

This is an independent client for Falling Fruit. It is meant to feel faster and more app like than the official site, especially on phones.

## Features

* Map powered by MapLibre GL
* Free basemap with no required map API key
* Clusters when zoomed out and individual fruit markers when zoomed in
* Filter by common fruits like apple, orange, lemon, and fig
* Search the full Falling Fruit type catalog
* Tap a spot to see details like species, address, season, photos, notes, and reviews
* Save spots on your device for offline use
* Optional Falling Fruit sign-in to sync saved spots
* Build a walking route from your locaton to saved spots
* Add new spots when signed in
* Leave notes or mark a spot as ripe
* Live location tracking
* Installable PWA with offline support
* Light and dark mode

## Tech stack

| Part      | Tech                                 |
| --------- | ------------------------------------ |
| Framework | React, TypeScript, Vite              |
| Map       | MapLibre GL JS                       |
| State     | Zustand                              |
| Storage   | IndexedDB and localStorage           |
| PWA       | vite-plugin-pwa                      |
| Geocoding | OpenStreetMap Nominatim              |
| Hosting   | Cloudflare Pages and Pages Functions |

## How it works

The app runs as a browser-based PWA. API requests go through a Cloudflare Pages Function, so the Falling Fruit API key is not exposed in the frontend.

```txt
Browser app
  ↓
Cloudflare Pages Function
  ↓
Falling Fruit API
```

In local development, Vite proxies `/api/*` requests to the Falling Fruit API.

For map data:

* Zoomed out: use `/clusters`
* Zoomed in: use `/locations`

The type catalog is cached locally, so fruit names, labels, and marker styles can load quicly.

## Attribution

* Location data from [Falling Fruit](https://fallingfruit.org) and its contributors
* Basemap from [OpenFreeMap](https://openfreemap.org) and [OpenStreetMap](https://www.openstreetmap.org/copyright)
* Place search from OpenStreetMap Nominatim

Please forage responsibily. Only pick where it is allowed, make sure you correctly identify anything before eating it, and leave some for other people and wildlife.

## Roadmap

Things that are not included yet:

* Edit or delete your own spots and reviews
* Anonymous contributing
* Whole-map “ripe now” filter
* Optional self-hosted basemap

## License

MIT — see [LICENSE](./LICENSE).
