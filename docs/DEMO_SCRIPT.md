# FieldSync five-minute click-by-click demo

## Start and sign in

1. In a terminal at the repository root, run `npm run setup`, then `npm run demo`. Leave the terminal open. It prints the preview and API URLs.
2. Open http://localhost:4173. Sign in as Amina with `amina@fieldsync.demo` / `WorkerDemo123!` (local development only).
3. Click **Collect**. Confirm **Water Access Survey** and **Community Health Check** appear with a version label; this also caches the app shell and assigned forms on the device.

## Demonstrate offline capture and rejection

1. Open browser DevTools → **Network** → check **Offline**. Reload the page. It should reopen from the service worker cache. (For automated acceptance, the Chromium test sets the browser context offline and reloads.)
2. In **Water Access Survey**, fill Village, choose **Well**, choose a value for the conditional **Is water treated?** question, and enter **42** for households. Click **Save response** twice more with valid answers so there are three local responses.
3. The renderer intentionally prevents invalid values. To create the server-rejection example for this presentation, use DevTools → **Application** → **IndexedDB** → `fieldsync` → `outbox`; edit one response's `answers.households` value from `42` to `-1`. This is client-valid cached data tampering but violates the server's minimum of 1.
4. Return to DevTools **Network** and uncheck **Offline**. In FieldSync click **Sync now** twice quickly. Two rows should become **SYNCED** once each, and the tampered one should show **REJECTED** with a reason that households is below its minimum.
5. Click **Edit** on the rejected row, change households back to `42`, and click **Save and resubmit**. The original client ID is retained; sync should mark that same row synced.

## Show the admin UI

1. Click **Sign out**. Sign in as `admin@fieldsync.demo` / `AdminDemo123!` (local development only).
2. Click **Forms** → find **Water Access Survey** → **Edit form / assignments**. Change a field label or option and click **Save new version**. Show the new version number and dated version history.
3. Click **Responses**. Select a form and worker, enter From/To dates, and choose a status. Click **Next page** if available; click **Export CSV** and show that the export reflects those filters.
4. Click **Dashboard** and point out the response summary and map. Mention that each stored response retains the form version used for collection.

Seeded logins above are for local development only. Never reuse or publish these passwords in a production deployment. To repeat the real-browser offline test, run `npx playwright install chromium` once, then `npm run e2e`.
