# Sundin Systems Scoreboard

Open https://sundin-scoreboard.vercel.app on your phone.

## Put it on your iPhone home screen
1. Open the link in **Safari**.
2. Tap **Share**, then **Add to Home Screen**, then **Add**.
3. Open it from the new Scoreboard icon. It runs full screen like an app and works offline.

The home screen app keeps its own data, separate from Safari. If you logged visits in Safari first,
use **Export JSON** there and **Import JSON** in the home screen app.

## Updates
The app checks for a new version when you open it and every 5 minutes while it's open.
When a new commit has been deployed, an **Update ready · Restart now** notice appears at the bottom.
Tap **Restart now** to load it; your data stays. The version you're running is shown under **Data**.

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
Your data is saved in the browser's local storage on this device. Use **Export JSON** now and then as a backup,
and **Import JSON** to restore it or move it to another browser.

## Development
- `npm install` then `npm test` runs the Playwright tests (desktop and phone sizes) against the built app.
- `npm start` builds into `dist/` and serves it at http://localhost:4173.
- `scripts/build.js` stamps the deploy's commit into `index.html` and `sw.js`. A changed `sw.js` is what
  tells installed apps that an update is ready.
- `node scripts/make-icons.js` re-renders the home screen icons in `icons/`.
- Every push and pull request runs the tests in GitHub Actions (`.github/workflows/ci.yml`).
- Vercel deploys `main` to production and builds a preview link for each pull request.
- Data lives in each browser separately, so your phone and your Mac keep separate scores.
