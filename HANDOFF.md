# Handoff: MapLibre 6.5 Brave verification

Updated: 2026-08-24 14:48 IST

## Current state

- Repository: `https://github.com/sanjeed5/food-safety-watch`
- Local path: `/home/ubuntu/repos/food-safety-watch`
- Branch: `main`
- Live Worker: `https://food-safety-watch.sanjeed5.workers.dev`
- Live Worker version: `d5c6f234-1bbc-4383-a863-3d4cf213050c`

## Root cause captured in Brave

The reported Brave console error was:

> Failed to load module script: The server responded with a non-JavaScript MIME type of “text/html”.

This was not a WebGL error. Brave had requested a stale hashed JavaScript asset from the previous deployment. Because Workers Static Assets used `not_found_handling: "single-page-application"`, the missing `.js` request was rewritten to `index.html` and returned as `200 text/html`; strict module MIME checking correctly rejected it.

## Fix

`wrangler.jsonc` now uses:

```json
"not_found_handling": "none"
```

Verified RED→GREEN locally and live:

- Before: missing `/assets/*.js` returned `200 text/html`.
- After: missing `/assets/*.js` returns `404`.
- Current hashed JavaScript returns `200 text/javascript`.
- `/about` remains `200 text/html`.
- `/api/inspections` remains `200` with seven records.

A hard refresh is still required for a browser holding old HTML to fetch the current asset URL. For future deployments, consider using Wrangler's `--old-asset-ttl=<seconds>` deploy flag to retain previous hashed assets briefly for active tabs.

## MapLibre state

The live Worker currently uses `maplibre-gl` 6.5.0 for direct Brave testing. The upgrade remains intentionally uncommitted pending confirmation:

- `package.json` modified
- `pnpm-lock.yaml` modified

Checks passed with MapLibre 6.5.0:

- Typecheck passed.
- 3/3 tests passed.
- Production build and Wrangler dry-run passed.

The previous WebGL2 incompatibility explanation is no longer supported by the captured Brave error. Keep MapLibre 6.5.0 if the map renders after a hard refresh; otherwise capture any new console/network failure before changing versions.
