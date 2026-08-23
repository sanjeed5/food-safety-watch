# Handoff: map does not load

Updated: 2026-08-23 18:45 IST

## User report

The deployed main page loads, but the map does not. The list and API remain available.

## Repository and deployment

- Repository: `https://github.com/sanjeed5/food-safety-watch`
- Local path: `/home/ubuntu/repos/food-safety-watch`
- Branch: `main`
- Live Worker: `https://food-safety-watch.sanjeed5.workers.dev`
- Live deployment still uses the last committed MapLibre 6 build. The compatibility changes in this handoff are committed but **not deployed**.

## Strongest diagnosis

The site used `maplibre-gl` 6.4.1. MapLibre 6 removed WebGL1 support and requires WebGL2. The likely failing surface is Telegram's in-app browser or another browser/device where WebGL2 is unavailable or restricted.

Evidence:

- MapLibre changelog: <https://github.com/maplibre/maplibre-gl-js/blob/main/CHANGELOG.md> states that v6 removed WebGL1 support and requires WebGL2.
- OpenFreeMap's current quick-start examples explicitly load `maplibre-gl@5`: <https://openfreemap.org/quick_start/>
- The deployed HTML, API, and OpenFreeMap style endpoints each returned HTTP 200 during debugging.

## Changes committed in this WIP

- Downgraded `maplibre-gl` from 6.4.1 to 5.24.0 to restore WebGL1 fallback.
- Added an explicit `Noto Sans Regular` font to the cluster-count layer. This avoids MapLibre's default request for an unavailable composite OpenFreeMap font URL.
- Added a visible `Loading map…` state.
- Added a 15-second failure state while preserving the accessible record list.
- Added `idle` handling to clear loading/failure UI once the map settles.

Files changed:

- `package.json`
- `pnpm-lock.yaml`
- `web/app.ts`
- `web/index.html`
- `web/styles.css`

## Local findings

After downgrading to MapLibre 5.24.0, this command passed before the final loading/fallback UI patch:

```bash
pnpm typecheck && pnpm test && pnpm build
```

Result: 3 tests passed; production build succeeded.

A local Chromium CDP run with WebGL2 explicitly disabled showed:

- Correct page title.
- One map canvas and one MapLibre control container.
- Seven rendered record cards.
- OpenFreeMap style, sprites, and planet TileJSON returned 200.
- The only observed OpenFreeMap 404 was the default `Open Sans Regular,Arial Unicode MS Regular` glyph request. The committed explicit Noto font patch is intended to remove it.

A headless screenshot still showed a blank map canvas. Headless SwiftShader/WebGL capture on this VPS is unreliable, so this is not sufficient proof that a real browser still fails. Do not deploy until the final patch is retested.

## Required next steps

1. Run the final checks because the loading/fallback patch was added after the last green run:

```bash
pnpm typecheck
pnpm test
pnpm build
```

2. Start local Cloudflare development:

```bash
pnpm wrangler dev
```

3. Test `http://localhost:8787` in a browser with WebGL2 disabled. Confirm:
   - Base-map roads and labels render.
   - Inspection markers render.
   - No OpenFreeMap glyph 404 remains.
   - `Loading map…` disappears after map idle.
   - The failure message appears after 15 seconds if the map cannot settle.

4. If the MapLibre 5/WebGL1 path works, deploy:

```bash
set -a
. /home/ubuntu/.hermes/secrets/cloudflare-account.env
set +a
pnpm wrangler deploy
```

5. Verify live root, API, map behavior, and `/about`. Then push any follow-up commit.

6. Ask Sanjeed to refresh the Telegram in-app browser and confirm the map loads. If it still fails, capture the device/browser and implement a non-WebGL fallback instead of guessing.

## Process state

The local Wrangler server and local Chromium debug process used during this investigation were stopped before handoff.
