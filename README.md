# Horizon

An academic and career command centre for students: goal-backward roadmaps, gap analysis, opportunity discovery, a document vault, application tracking, and an essay and CV builder.

## Run it

```bash
npm install
cp .env.example .env    # then add your APIFY_API_TOKEN
npm run dev             # http://localhost:5173
```

To run a production build, use `npm start`. It builds the app and serves it with the same server.

## Configuration (`.env`, server only)

| Variable | Required | Purpose |
|---|---|---|
| `APIFY_API_TOKEN` | Yes | Private key for the existing **Africa Scholarship and Essay Crawler** Actor (`seyi_glory/africa-scholarship-and-essay-crawler`). Read only by `server/opportunities.js` and sent to Apify as an Authorization header. It never reaches the browser. |
| `ANTHROPIC_API_KEY` | No | Turns on enhanced writing in the essay builder. Without it, Horizon builds drafts from the student's profile only. |
| `PORT` | No | Defaults to 5173. |

`.env` and the `.cache/` folder are git-ignored.

## How opportunities load

1. `GET /api/opportunities` reads the Actor's **latest successful run** dataset (fast, no new crawl).
2. If there's no previous run, it starts the Actor with its documented default input and waits for the results (up to about 5 minutes).
3. Results are cleaned up (`server/normalize.js`) and cached for 6 hours in memory and in `.cache/`. The **Refresh** button starts a new crawl, at most once every 5 minutes.

Type, level, field, location and funding are keyword readings of each listing's own text. When nothing matches, they're left empty and the page shows "Not stated in listing". Nothing is invented.

## Accounts and student data

Students sign up with a name, email and password (at least 8 characters, with a letter and a number). Passwords are hashed with scrypt, and sessions use a random token in an HttpOnly cookie that lasts 30 days. Repeated failed sign-ins are slowed down.

Each account's profile, roadmap, applications, drafts and uploaded documents are saved on the server in `.data/`, which is git-ignored, so students can sign in on any device. The browser keeps a working copy and saves changes to the account automatically. Signing out removes the copy from that browser. Students can also download a copy of their data or permanently delete their account from Profile → Settings.

Password reset by email isn't available yet, because it needs an email-sending service.

## Deploying on Vercel

1. In the Vercel project, open **Settings → Git** and set the **Production Branch** to `horizon-app`.
2. In **Settings → Environment Variables**, add every variable from `.env.example`, using your real values. Set `APP_URL` to your Vercel address, for example `https://your-app.vercel.app`.
3. Redeploy.

`vercel.json` sends every page address to the app, runs the server code as a Vercel function, and schedules the email check once a day at 07:00 UTC. Vercel's free plan allows daily schedules only. Uploaded documents are limited to 4 MB each, because of Vercel's request size limit.
