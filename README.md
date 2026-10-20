# Sundin Systems Scoreboard

Live at https://sundin-scoreboard.vercel.app.

**On iPhone:** open it in Safari, tap Share, then **Add to Home Screen**. It opens full screen like an app and works without signal. When a new version is deployed, a **Restart now** banner appears; tap it to update. Note: the home-screen app keeps its own data, separate from Safari's, so log visits in one place.

## The game
Shop visits are field research, not selling. You score points for what you learn:

| Action | Points |
|---|---|
| Walked in | 3 |
| Talked with owner | 5 |
| Owner names a problem in their own words (log the quote) | 5 |
| Follow-up booked | 10 |
| Founding shop says yes | 25 |
| System goes live | 25 |

- **Level 1 (100 pts):** you've earned building the AI missed-call agent in Claude Code.
- **Level 2 (3 shops live):** you've earned adding evals on their real calls.

## Rules
- Do one field block a week (three shops in one neighborhood). The streak counts weeks, not days.
- Change one variable each week (opening line, neighborhood, time of day) and log it under "This week's experiment."
- Do the HighLevel setup only after a shop says yes.
- Report your score every week. A Saturday check-in arrives in the Claude project thread.

## The weekly quest
One small, fixed quest covers both tracks, in any order: 3 shops walked into, 5 LeetCode problems,
1 system design session, 1 behavioral story. Switch between them whenever one gets boring.

- **Field tab:** shop visits, experiments and quotes (Sundin Systems).
- **Prep tab:** log a new LeetCode problem (+3); it returns for review after 3, 10 and 30 days (+2 each).
  System design topics (+5 per session) and behavioral stories (+3 per practice) are one-tap.
- **Progress tab:** D3 charts. Points per week by track (tap a week to list its entries), active days,
  the field funnel, and LeetCode problems solved over time.

Level 1 and Level 2 still count field points only, so the AI-agent reward stays tied to shop visits.

## Sync between devices
Every device keeps a full local copy, so the app works with no signal. When a device is connected
with the sync key, it merges its copy with the server's whenever you log something, open the app,
or come back online. Merging matches records by id and keeps the newer edit. Deletions spread to
other devices, and a device's existing scores are added, never overwritten.

One-time setup in Vercel (project **sundin-scoreboard**):
1. **Storage** tab, then **Create Database**, then **Upstash for Redis** (the free plan is plenty), connected to this project.
   That adds `KV_REST_API_URL` and `KV_REST_API_TOKEN`.
2. **Settings**, then **Environment Variables**: add `SYNC_TOKEN` with a long random value
   (for example, the output of `openssl rand -base64 24`). This is your sync key.
3. Redeploy, then on each device open the Data panel and enter the sync key.

The API is `api/sync.js`; the merge rules live in `sync-merge.js` and are shared with the browser.

## Data
Your data is saved in the browser's local storage for this file. Use **Export JSON** now and then as a backup,
and **Import JSON** to restore it or move it to another browser.

## Development
- `npm install` then `npm test` runs the Playwright tests (desktop and phone sizes, plus install/offline/update checks).
- `node scripts/build.mjs` builds `dist/`, stamping the commit SHA into the page, manifest and service worker. That stamp is what makes installed copies notice an update.
- Every push and pull request runs the tests in GitHub Actions (`.github/workflows/ci.yml`).
- Vercel deploys `main` to production and builds a preview link for each pull request.
- Data lives in each browser separately, so your phone and your Mac keep separate scores.
