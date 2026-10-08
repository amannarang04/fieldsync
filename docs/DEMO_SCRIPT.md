# FieldSync 4-minute demo

**0:00–0:30 — The problem.** Explain how paper forms disappear, transcription creates mistakes, and remote sites lose connectivity.

**0:30–1:15 — Admin builds a form.** Sign in as `admin@fieldsync.demo`, open Forms, add a required village text field, a water-source choice, and a conditional follow-up shown only for wells. Publish and assign it to Amina.

**1:15–2:15 — Worker goes offline.** Sign out, sign in as `amina@fieldsync.demo` (`WorkerDemo123!`), open the assigned survey once so it is cached, then enable airplane mode. Fill and save three responses. Intentionally omit a required answer in one local record to demonstrate server-side rejection (edit the local IndexedDB row in developer tools if needed; the UI blocks invalid entries).

**2:15–3:00 — Sync.** Restore connectivity, press Sync now, and show accepted entries marked SYNCED exactly once. The invalid entry remains REJECTED with the server's reason and can be edited and resubmitted.

**3:00–4:00 — Admin review.** Sign in as admin, view response counts and the map, filter responses, and download the CSV export.

Seeded sample logins: `admin@fieldsync.demo` / `AdminDemo123!`; `amina@fieldsync.demo` / `WorkerDemo123!`; `leo@fieldsync.demo` / `WorkerDemo123!`.
