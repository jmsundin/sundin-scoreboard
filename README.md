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

## Data
Your data is saved in the browser's local storage for this file. Use **Export JSON** now and then as a backup,
and **Import JSON** to restore it or move it to another browser.

## Development
- `npm install` then `npm test` runs the Playwright tests (desktop and phone sizes, plus install/offline/update checks).
- `node scripts/build.mjs` builds `dist/`, stamping the commit SHA into the page, manifest and service worker. That stamp is what makes installed copies notice an update.
- Every push and pull request runs the tests in GitHub Actions (`.github/workflows/ci.yml`).
- Vercel deploys `main` to production and builds a preview link for each pull request.
- Data lives in each browser separately, so your phone and your Mac keep separate scores.
