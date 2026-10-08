# Submission form draft

Copy and paste the values below into the corresponding project submission fields. Replace every bracketed placeholder before submitting.

**Project Name**  
FieldSync

**Student Name**  
[Your full name]

**Problem Statement**  
Field teams working in areas with unreliable connectivity often rely on paper surveys, which can be lost or entered inconsistently later. FieldSync lets workers collect structured survey responses offline and safely synchronize them when connectivity returns. Administrators can manage survey versions, review results, and export filtered data.

**GitHub Repository**  
https://github.com/amannarang04/fieldsync

**Deployed Application**  
[Paste the live Vercel application URL after deployment]

**Demo Video**  
[Paste the shareable demo video URL]

**Tech Stack**  
React, TypeScript, Vite/PWA, Dexie/IndexedDB, Node.js, Express, Zod, PostgreSQL, Prisma, JWT, bcrypt, Leaflet/OpenStreetMap, Playwright, Vitest.

**Major Features**

- Authentication with admin/worker roles and role-scoped response access.
- Form builder with immutable version history, assignments, and conditional logic.
- Offline collection with a cached app shell and assigned forms.
- Idempotent sync engine with retries, token refresh, and server-side version/assignment/answer revalidation.
- Admin dashboard with response map, form/worker/date/status filters, pagination, and filtered CSV export.

## Final checklist

This 21-item crosswalk reflects the implementation and deliverables requested for this project. If the official form uses different wording, map these statuses to its exact labels before submission.

| # | Checklist item | Status |
|---:|---|---|
| 1 | Project name entered | Done — draft provided above |
| 2 | Student name entered | Manual — replace placeholder |
| 3 | Problem statement included | Done — draft provided above |
| 4 | Target users/use case explained | Done — described above and in README |
| 5 | Technology stack listed | Done — draft provided above |
| 6 | Public source repository URL supplied | Manual — create/push public GitHub repository and paste URL |
| 7 | Deployed application URL supplied | Manual — deploy Vercel and Render, then paste URL |
| 8 | Demo video URL supplied | Manual — record/upload video and paste shareable URL |
| 9 | Authentication implemented | Done — JWT access/refresh flow |
| 10 | Admin/worker role separation implemented | Done — authorization and worker scoping |
| 11 | Form creation/editing implemented | Done — admin form builder |
| 12 | Form version history preserved | Done — published edits create new versions |
| 13 | Conditional fields supported | Done — conditions use a source field and value |
| 14 | Form assignments enforced | Done — workers see and submit only assigned forms |
| 15 | Offline app/form caching implemented | Done — service worker and local form cache |
| 16 | Offline responses stored locally | Done — IndexedDB outbox |
| 17 | Sync retries are idempotent | Done — stable client UUID and database uniqueness |
| 18 | Server validates synced responses | Done — validates original version, assignment, and answers |
| 19 | Rejected responses can be repaired | Done — shared renderer and same client ID on resubmit |
| 20 | Admin reporting/map/filter/CSV implemented | Done — dashboard and filtered export |
| 21 | Tests, documentation, and final submission reviewed | Manual — run the final commands and confirm exact official checklist wording |

Final local commands: `npm run setup`, `npm run demo`, `npm test`, `npm run build`, and `npm run e2e`. The demo terminal must remain open while demonstrating the application.
