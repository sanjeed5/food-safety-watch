# Food Safety Watch

A sourced, searchable map of publicly reported food-safety inspection events in Bengaluru.

## Accuracy contract

- Accuracy is the launch-blocking requirement. Never publish an adverse claim until the exact outlet, dated event, wording, and supporting evidence have been manually verified.
- Automated or AI-assisted intake may suggest drafts but must never publish records automatically.
- Every published record names its source.
- Records describe dated findings and actions, not a business's permanent or current safety status.
- Exact outlet identity is required. Ambiguous chain-level mentions stay unpublished.
- Social posts are not accepted as sole evidence.
- Corrections update the record without erasing the source trail.

## Stack

- Cloudflare Workers with Static Assets
- Cloudflare D1
- MapLibre GL JS with OpenFreeMap
- Vite + TypeScript

## Local development

```bash
pnpm install
pnpm cf-typegen
pnpm build
pnpm wrangler d1 migrations apply food-safety-watch-db --local
pnpm dev
```

The API is available at `/api/inspections` and `/api/health`.

## Deploy

```bash
pnpm wrangler d1 migrations apply food-safety-watch-db --remote
pnpm deploy
```

## Data updates

Add reviewed records through a numbered SQL migration. Keep `is_published = 0` until the outlet identity, wording, coordinates, and source link have been checked.
