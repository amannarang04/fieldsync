# FieldSync 5-minute demo

**0:00–0:30 — The problem.** Explain how paper forms disappear, transcription creates mistakes, and remote sites lose connectivity.

**0:30–1:30 — Admin creates and versions a form.** Sign in as `admin@fieldsync.demo`. Create a form with a required village text field, water-source choices, and a conditional follow-up for wells. Assign it to Amina and publish. Reopen the published form, change a field or assignment, save the next version, and show the version history with version numbers and dates.

**1:30–2:30 — Worker works offline.** Sign in as `amina@fieldsync.demo` (`WorkerDemo123!`) and open the assigned form once to cache it. In Playwright, switch the browser context offline and reload. Fill and save three responses; one may be made invalid in IndexedDB to demonstrate authoritative server rejection, since the renderer blocks invalid values.

**2:30–3:30 — Sync and repair.** Restore connectivity, trigger Sync now twice quickly, and show the two accepted entries marked SYNCED and the rejected entry's visible reason. Open the rejected entry, correct it in the same renderer (including choice, date, conditional, or GPS fields), and resubmit with its existing client ID.

**3:30–4:30 — Admin reviews results.** Sign in as admin. Filter the response table by form, worker, status, and date range; move between pages; download CSV and show that it uses the selected filters. Point out the form version recorded on each response.

**4:30–5:00 — Security and reliability.** Explain that sync validates against the exact immutable form version and the worker's current assignment, and that a unique client ID makes retries idempotent.

Seeded sample logins: `admin@fieldsync.demo` / `AdminDemo123!`; `amina@fieldsync.demo` and `leo@fieldsync.demo` / `WorkerDemo123!`.

For the offline browser flow use `npm run e2e`; it runs Chromium against the built app served by Vite preview, not the Vite development server.
