# Production recovery runbook

## Before a data migration

1. Run `pnpm validate:data` against production and save the result in the release log.
2. Create a D1 Time Travel bookmark:
   `pnpm wrangler d1 time-travel info food-safety-watch-db`
3. Record the bookmark and current Worker deployment ID outside the repository.
4. Apply the migration remotely, deploy, then verify `/api/health`, `/api/inspections`, and the public map.

## Restore D1

Use the recorded bookmark or timestamp. Review the current Wrangler help before executing because restore syntax may change:

`pnpm wrangler d1 time-travel restore food-safety-watch-db --bookmark=<bookmark>`

After restoration, verify record count, IDs, source provenance, and latest-review metadata before reopening promotion.

## Roll back the Worker

1. List deployment history: `pnpm wrangler deployments list`.
2. Roll back to the last verified deployment using the current Wrangler rollback command.
3. Probe root, About, API health, API inspections, current JavaScript, and the MapLibre worker.

## Incident rule

If accuracy is disputed, unpublish the affected record first, preserve its evidence trail, then investigate. Never silently rewrite an adverse claim or auto-publish a correction.

Owner: repository maintainer. Exercise this procedure quarterly and after material D1/Wrangler changes.
