# Security review

Reviewed with `npm audit` on 2026-10-08. `npm audit fix` was run, then direct development tools were upgraded to clear the critical Vitest and `concurrently` advisories. The current full-tree audit reports no critical issues and 10 remaining advisories (8 high, 2 moderate). The remaining findings are in the Tailwind/PostCSS build chain and Prisma CLI/configuration chain. Prisma's CLI package is a development dependency, though npm's workspace audit still reports it under `--omit=dev` because it is resolved through the workspace's Prisma client peer relationship.

| Dependency path | Severity | Why it remains / mitigation |
| --- | --- | --- |
| `tailwindcss@3.4.19` → `chokidar` / `micromatch` / `braces`, and PostCSS selector parser | High/moderate | Tailwind 3's transitive dependency ranges are reported by npm. Tailwind runs at build time; the generated CSS is served in production. Moving to Tailwind 4 requires a configuration and plugin migration, so this major change is deferred instead of risking a broken production stylesheet. |
| `prisma@6.19.3` → `@prisma/config` → `deepmerge-ts@7.1.5` | High | This is the Prisma CLI/configuration toolchain used for local migrations and build-time client generation, not the request-serving runtime. A Prisma major migration changes datasource configuration and generated-client setup; it needs a separate migration with deployment verification. |

No vulnerable package in the findings is used by the deployed request-serving code. The Prisma configuration finding affects CLI operations; Tailwind and PostCSS findings affect CSS compilation. Re-run `npm audit` after dependency changes. These findings should be revisited when the associated major upgrades are scheduled.

## Controls checked

- Helmet security headers are enabled globally.
- CORS reads the single allowed origin from `CLIENT_ORIGIN` (with a local development default).
- All auth routes have a rate limiter (30 requests per 15 minutes per IP).
- Refresh-token values are hashed before create, lookup, and deletion; raw tokens are returned only to the client.
- Access is checked by role and ownership. Worker response reads are scoped to the signed-in worker, and sync rejects forms that are not assigned to the worker.
- Secrets are read from environment variables; `.env` files are ignored. The seeded demo credentials and test signing keys are intentionally non-production fixtures.
- Git history was searched for committed `.env` files and common private-key/token/production-secret markers; no production secrets were found.
