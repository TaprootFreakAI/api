# Contributing

The map API keeps the same gates as the 21.gifts API.

Before a change is ready:

- `bun run typecheck`
- `bun run lint` (ESLint and Prettier)
- `bun run handbook:check` — every exported function and every HTTP route has a handbook section
- `bun run e2e:check` — every exported function and every HTTP route has an end-to-end title or request
- `bun run test:coverage` — 100 percent lines, branches, functions, and statements under `src`, except `src/index.ts`
- `bun run e2e` — HTTP checks against `GET /healthz` and `/map/places`

Do not lower a coverage threshold to land a change. A genuinely unreachable branch needs a `v8 ignore` comment that says why.
