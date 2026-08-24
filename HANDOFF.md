# Handoff: MapLibre 6.5 fixed and deployed

Updated: 2026-08-24 14:53 IST

## Current state

- Repository: `https://github.com/sanjeed5/food-safety-watch`
- Local path: `/home/ubuntu/repos/food-safety-watch`
- Branch: `main`
- Live Worker: `https://food-safety-watch.sanjeed5.workers.dev`
- Live Worker version: `beb0b9f5-1e4b-4259-999a-f7f9e98aac8c`
- MapLibre: 6.5.0

## Actual failures and fixes

### 1. Stale module returned as HTML

Brave reported:

> Failed to load module script: The server responded with a non-JavaScript MIME type of “text/html”.

A stale hashed JavaScript request was being rewritten to `index.html` because Workers Static Assets used `not_found_handling: "single-page-application"`.

Fix: `wrangler.jsonc` now uses `not_found_handling: "none"`.

Verified locally and live:

- Missing `/assets/*.js` returns 404 instead of `200 text/html`.
- Current JavaScript returns `200 text/javascript`.
- `/about` remains 200.
- API remains 200 with seven records.

### 2. MapLibre 6 worker bundle missing

MapLibre 6 is ESM-only and loads a separate worker bundle. Vite did not emit it automatically, so the runtime requested `/assets/maplibre-gl-worker.mjs`, received 404, and the map remained blank.

Fix in `web/app.ts`:

```ts
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
maplibregl.setWorkerUrl(workerUrl);
```

Vite now emits a hashed worker asset and the main bundle points to it.

## Verification

- Typecheck passed.
- 3/3 tests passed.
- Production build passed.
- Wrangler dry-run passed.
- Local fresh Chromium with WebGL2: roads, labels, clusters, and markers visibly rendered; loading cleared; fallback hidden.
- Live fresh Chromium: same visual result, seven records, attribution visible, no map/network errors.
- Only remaining browser request error is a harmless missing favicon.

Future deploys use `wrangler deploy --old-asset-ttl=86400` to retain previous hashed assets for one day and reduce active-tab breakage across deployments.

The earlier WebGL2 incompatibility hypothesis was incorrect. The captured failures were stale-asset SPA routing and the missing MapLibre 6 worker bundle.
