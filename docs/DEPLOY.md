# Deployment

## Render API

1. Push this repository to GitHub and create a Render PostgreSQL database in the same region as the web service.
2. Create a Render web service from the repository and use the checked-in `render.yaml` blueprint. It builds shared types, runs `prisma migrate deploy`, builds the API, prunes development and optional tooling from the runtime install, starts `npm run start --workspace=server`, and probes `/api/health`.
3. Configure the API service environment:

| Variable | Value |
| --- | --- |
| `NODE_ENV` | `production` |
| `DATABASE_URL` | Render PostgreSQL **internal** connection URL (or the provider's server-side URL) |
| `JWT_ACCESS_SECRET` | Generate a unique secret in Render; minimum 32 random bytes |
| `JWT_REFRESH_SECRET` | Generate a different unique secret in Render; minimum 32 random bytes |
| `CLIENT_ORIGIN` | Exact frontend origin, e.g. `https://fieldsync-demo.vercel.app` (comma-separated if multiple origins are required) |
| `PORT` | Leave unset; Render provides the port |
| `SEED_ADMIN_PASSWORD` | Leave unset for normal deployment; if intentionally seeding, use a unique strong password only for that seed run |
| `SEED_WORKER_PASSWORD` | Leave unset for normal deployment; if intentionally seeding, use a different unique strong password only for that seed run |

Do not set `SEED_ADMIN_PASSWORD` or `SEED_WORKER_PASSWORD` for an ordinary deployment; do not seed demo accounts into a public service. If an operator deliberately seeds production data, provide two unique strong values through a trusted environment for that one seed run. Production seeding exits with a clear error if either is missing. Never put real values in Git, README files, or deployment configuration committed to the repository.

4. Deploy. Open `https://<your-render-service>.onrender.com/api/health` and confirm `{"status":"ok"}`.

The application start command uses the compiled server and environment variables only; the local ignored `server/.env` file is optional and is not needed on Render. Migrations run during deploy before the API is started. The final `npm prune --omit=dev --omit=optional` removes Prisma CLI and other build/test tools after generation and migrations; the API runtime keeps `@prisma/client` and application dependencies.

## Vercel frontend

1. Import the same GitHub repository into Vercel. Set the project root directory to the repository root so npm workspaces can resolve `shared` and `client`.
2. Set **Install Command** to `npm install`, **Build Command** to `npm run build --workspace=shared && npm run build --workspace=client`, and **Output Directory** to `client/dist`.
3. Add this environment variable for Production (and Preview if used):

| Variable | Value |
| --- | --- |
| `VITE_API_URL` | `https://<your-render-service>.onrender.com/api` |

4. Deploy the frontend, copy its exact origin (for example `https://fieldsync-demo.vercel.app`), add it to Render's `CLIENT_ORIGIN`, then redeploy the API. If Vercel preview deployments need API access, add their exact allowed origins as comma-separated entries; avoid a wildcard.
5. Verify the Vercel URL loads the SPA and that login/forms use the deployed API.

`render.yaml` contains the API build/start commands and `/api/health` check. `client/vercel.json` provides the SPA fallback rewrite to `/index.html`.

## Keep-warm note

Render's free web services may sleep after inactivity. The first request after sleep can take longer. If you choose to reduce idle sleeps, configure a free uptime pinger to request `https://<your-render-service>.onrender.com/api/health` periodically, subject to Render's current free-tier terms. This is optional and does not replace health monitoring.

## Local production-preview demo

From a clean checkout run `npm run setup`, then `npm run demo`. The latter builds and starts both the API and Vite production preview; the local health URL is `http://localhost:3001/api/health` and the preview is `http://localhost:4173`.
