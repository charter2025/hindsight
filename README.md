# Hindsight

A macro time-machine investing game. $10,000, a hidden five-year window between 1925 and 2025, three decisions.

- `index.html` is the whole game (static).
- `api/score.js` takes a daily-puzzle play, **replays it on the server** and stores the score. The browser's score is never trusted.
- `api/leaderboard.js` returns today's board or all-time points.
- `api/_engine.js` is the game engine, generated from the same source as the page so client and server always agree.
- Scores live in Upstash Redis.

## Deploy on Vercel

1. Push this folder to a new GitHub repo.
2. In Vercel: **Add New → Project**, import the repo. Framework preset: **Other**. No build command, no output directory. Deploy.
3. In the project: **Storage → Create / Connect → Upstash for Redis** (Marketplace), and connect it to the project. This adds `KV_REST_API_URL` and `KV_REST_API_TOKEN`. (If you'd rather reuse an existing Upstash database, set `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` yourself.)
4. Redeploy so the functions pick up the variables.
5. Optional: **Settings → Domains** to add your own domain.

CLI alternative: `npm i -g vercel && vercel` from this folder, then `vercel --prod` after connecting storage.

## Editing

Edit `src/template.html` (page + engine), `src/headlines.json` (news wire) or `src/data.json` (returns), then run:

    python3 scripts/build.py

and commit the regenerated `index.html` and `api/_engine.js`.

`scripts/build_data.py` documents how `src/data.json` was built from the public datasets (Damodaran, Shiller, BLS, EIA, Fed, ChartRow).

## Notes

- Daily puzzle numbers start at #1 on 14 Nov 2026 and roll over at the player's local midnight. The server accepts plays for yesterday, today and tomorrow (UTC) to cover time zones.
- Players are anonymous: an id is kept in the browser with the name they type. Clearing browser storage starts a new player.
- Challenge links look like `https://your-site/?c=HS-xxxxx-812`.
