# portfolio-bot (AI backend for Bit)

The site works without this. Bit answers from `js/data.js` with keyword matching.
Deploy this Worker to let Bit answer free-form questions with Claude.

GitHub Pages can't keep secrets, so the Claude API key lives here in a Cloudflare Worker,
and the site calls it at `/chat`. The Worker reads the live `js/data.js` for its knowledge,
so when you update the portfolio, Bit updates too (within ~10 minutes).

## Deploy (one time, ~5 minutes)

1. Create a free Cloudflare account, and get an API key at https://console.anthropic.com.
   In the Console, set a **monthly spend limit** (Settings → Limits) so a traffic spike can't surprise you.
2. In this folder:
   ```sh
   npm install
   npx wrangler login
   npx wrangler secret put ANTHROPIC_API_KEY   # paste the key when prompted
   npx wrangler deploy
   ```
3. Wrangler prints a URL like `https://portfolio-bot.<you>.workers.dev`.
   Put it in `js/data.js`:
   ```js
   assistant: { name: "Bit", endpoint: "https://portfolio-bot.<you>.workers.dev/chat" },
   ```
4. Commit and push. Done.

## Settings (`wrangler.toml`)

| Var | Purpose |
|---|---|
| `ALLOWED_ORIGINS` | Sites allowed to call the bot. Keep `https://sanvisal.github.io`. |
| `DATA_URL` | Where the bot reads portfolio facts. |
| `MODEL` | Claude model. `claude-opus-5-5` gives the best answers. `claude-haiku-5-5` is much cheaper and fine for short Q&A. |
| `[[ratelimits]]` | 8 messages per minute per visitor IP. |

## Test locally

```sh
echo ANTHROPIC_API_KEY=sk-ant-... > .dev.vars   # gitignored
npx wrangler dev
curl -X POST http://localhost:8787/chat -H "origin: http://localhost:5500" \
  -H "content-type: application/json" -d '{"messages":[{"role":"user","content":"What has Visal built?"}]}'
```

If the Worker is down, out of credit, or rate-limited, the site falls back to local answers.
