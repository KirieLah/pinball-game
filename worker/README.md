# Pinball leaderboard Worker

This Worker serves `GET /api/scores` and `POST /api/scores`. It stores only the
top five scores for each level in D1. Score submissions require a successful
Turnstile verification.

## One-time Cloudflare setup

1. Install Node.js, then open PowerShell in the repository root.
2. Log in to Cloudflare:

   ```powershell
   npx wrangler@latest login
   ```

3. The D1 binding is configured in `worker/wrangler.jsonc` for the
   `pinball-score` database using its database ID. Confirm it matches the
   database shown in the Cloudflare dashboard.
4. Apply (or safely re-apply) the database schema:

   ```powershell
   npx wrangler@latest d1 execute pinball-score --remote --file=worker/schema.sql --config worker/wrangler.jsonc
   ```

5. In **Cloudflare dashboard → Turnstile**, confirm the widget allows
   `kirielah.github.io`. Add the widget's **secret key** to the Worker using
   either the dashboard's **Settings → Variables and Secrets → Add → Secret**
   flow, or Wrangler:

   ```powershell
   npx wrangler@latest secret put TURNSTILE_SECRET --config worker/wrangler.jsonc
   ```

   Paste the secret at Wrangler's hidden prompt. If `TURNSTILE_SECRET` already
   exists as a Worker secret, keep it and skip this step. If it exists as a
   plain-text variable, remove that variable before adding the secret with the
   same name. Never put the secret in Wrangler config or Git.
6. Deploy the Worker:

   ```powershell
   npx wrangler@latest deploy --config worker/wrangler.jsonc
   ```

   This deploys as `pinbal-score-api`, matching
   `https://pinbal-score-api.eirik-halseth.workers.dev`. Preview URLs are
   disabled in this configuration.

The rate-limit namespace ID in the config must be unique across your Cloudflare
account. If Wrangler reports that it is already in use, change it to another
integer and deploy again. The limit is approximate and allows 10 score
submissions per minute per IP address in each Cloudflare location.

## API

- `GET /api/scores` returns the five highest scores for each of the three levels.
- `POST /api/scores` accepts `{ "level", "score", "name", "turnstileToken" }`.
  The Worker validates the origin, input size, name and score, rate-limits the
  request, verifies the Turnstile token server-side, and only inserts a score
  that makes that level's top five.

The Turnstile site key is public and configured in `pinball.html`. The secret
key belongs only in Cloudflare Worker secrets. The API allows the published
GitHub Pages origin and `localhost:8787` for local API checks. Turnstile
submissions are accepted only from the published hostname. It does not make
scores cheat-proof: a modified browser can still submit a fabricated score
after passing Turnstile.

## Free-tier expectations

This setup is designed for Cloudflare Workers Free and D1's free allowances;
the config cannot select or enforce your account's billing plan. Confirm the
account remains on Free if you want to avoid usage-based Worker/D1 overages.
On the Free plan, daily Workers or D1 limits can make the leaderboard
unavailable until the quota resets. The per-IP limiter is a best-effort abuse
guard, not a global hard limit. `.dev.vars` files are ignored by Git so local
Worker secrets are not accidentally committed.
