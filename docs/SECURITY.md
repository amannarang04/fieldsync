# Security review

Reviewed with `npm audit` on 2026-10-08. `npm audit fix` was run, then direct development tools were upgraded to clear the critical Vitest and `concurrently` advisories.

Exact workspace audit summaries:

- `npm audit --omit=dev --workspace=@fieldsync/client` → `found 0 vulnerabilities`.
- `npm audit --omit=dev --workspace=@fieldsync/server` → `3 high severity vulnerabilities`, all reported through `prisma` → `@prisma/config` → `deepmerge-ts` in npm's workspace-resolved tree.
- `npm audit` → 10 total (8 high, 2 moderate, 0 critical), all in development/build tooling paths listed below.
- Render runs `npm prune --omit=dev --omit=optional` after migration/build. A clean production-only install then has no `prisma`, `@prisma/config`, or `deepmerge-ts` packages; `@prisma/client` and the generated query engine remain for API queries. The prune audit summary was `found 0 vulnerabilities`; the client production audit is clean.

| Dependency path | Severity | Why it remains / mitigation |
| --- | --- | --- |
| `tailwindcss@3.4.19`, `chokidar`, `fast-glob`, `micromatch`, `braces`, `postcss-nested`, `postcss-selector-parser` | High/moderate | npm reports the Tailwind 3 transitive ranges. These packages run only during CSS/build processing; they are not shipped in `client/dist` or executed by the production browser. Tailwind 4 requires a config/plugin migration and is deferred for a separate verified change. |
| `prisma@6.19.3`, `@prisma/config`, `deepmerge-ts@7.1.5` | High | The finding is in the Prisma CLI/configuration toolchain (server devDependency) used for migrations and client generation. Render prunes dev and optional packages after these build steps; the CLI/config package is absent from production runtime and request handling. npm's server-workspace `--omit=dev` report still shows 3 highs due the workspace's lockfile-resolved Prisma Client optional-peer relationship, even though the pruned production install excludes those packages. A Prisma major migration changes datasource/client setup and requires deployment verification. |

These packages execute during build/deploy tooling where applicable, but are not shipped or executed in the production API/browser runtime. Re-run the exact commands above after dependency changes. Revisit these findings when the associated major upgrades are scheduled.

## Controls checked

- Helmet security headers are enabled globally.
- CORS reads the single allowed origin from `CLIENT_ORIGIN` (with a local development default).
- All auth routes have a rate limiter (30 requests per 15 minutes per IP).
- Refresh-token values are hashed before create, lookup, and deletion; raw tokens are returned only to the client.
- Access is checked by role and ownership. Worker response reads are scoped to the signed-in worker, and sync rejects forms that are not assigned to the worker.
- Secrets are read from environment variables; `.env` files are ignored. The seeded demo credentials and test signing keys are intentionally non-production fixtures.
- Git history was searched for committed `.env` files and common private-key/token/production-secret markers; no production secrets were found.
