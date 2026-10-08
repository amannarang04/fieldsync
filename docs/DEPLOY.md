# Deployment

## API on Render

1. Create a managed PostgreSQL database on Neon, Supabase, or Render and copy its pooled/runtime connection string.
2. Create a Render web service from this repository using `render.yaml`.
3. Set `DATABASE_URL` and `CLIENT_ORIGIN` in the service environment. Render generates the JWT secrets.
4. Deploy. The build command compiles the shared schemas, applies Prisma migrations, and builds the API. Verify `/api/health` returns `{"status":"ok"}`.
5. Run the seed command once from a trusted environment with the production `DATABASE_URL` if demo records are wanted. Change demo passwords immediately.

## Frontend on Vercel

1. Import the repository into Vercel.
2. Set the root directory to `client` (or use the monorepo root and configure the client workspace build).
3. Build command: `npm run build --workspace=shared && npm run build --workspace=client`; output directory: `client/dist`.
4. Set `VITE_API_URL` to the deployed API URL plus `/api`.
5. Add the deployed Vercel origin to the API `CLIENT_ORIGIN`, then redeploy the API.

Live URL placeholders: Frontend: `https://<your-project>.vercel.app`; API: `https://<your-service>.onrender.com`.
