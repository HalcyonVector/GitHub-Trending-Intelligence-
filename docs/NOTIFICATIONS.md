# Notifications & Weekly Digest

The app can send a **weekly digest** (top movers + breakouts) to any combination of
Discord, Slack, and email. Every channel is optional — add secrets only for the ones
you want; unset channels are silently skipped.

A **breakout** = a repo created in the last 30 days whose momentum is above the
threshold (`BREAKOUT_MIN_MOMENTUM`, default 30). "Top movers" = highest momentum overall.

## Schedule

`.github/workflows/digest.yml` runs Mondays at 09:00 UTC (and can be run on demand
from the Actions tab). It calls `backend/scripts/send_digest.py`.

## Add the channel(s) you want

All values go in **repo → Settings → Secrets and variables → Actions → New secret**.

### Discord (easiest)
1. Discord server → **Server Settings → Integrations → Webhooks → New Webhook**.
2. Pick a channel, **Copy Webhook URL**.
3. Add secret `DISCORD_WEBHOOK_URL` = that URL.

### Slack
1. Create an **Incoming Webhook** at https://api.slack.com/messaging/webhooks.
2. Add secret `SLACK_WEBHOOK_URL` = the webhook URL.

### Email (Resend, free)
1. Sign up at https://resend.com and create an **API key**.
2. Add secrets: `RESEND_API_KEY` = the key, and `ALERT_EMAIL_TO` = your email. For
   **multiple subscribers**, make `ALERT_EMAIL_TO` a comma-separated list
   (`me@example.com, you@example.com`) — each person gets their own private copy
   (one send per address, no shared To/CC).
3. The default sender is Resend's shared `onboarding@resend.dev`, which (on the free
   tier) can only deliver to the address you signed up with — fine for a personal
   digest. To send to **other** subscribers, verify your own domain in Resend and set
   `ALERT_EMAIL_FROM` (env/var) to an address on it; then any recipient in the list
   receives the digest.

## Test it

After adding at least one channel secret: **Actions → weekly-digest → Run workflow**.
You should get the digest within a minute. If nothing arrives, check the run log — a
failing channel logs a warning but won't fail the job.

## Tuning (optional env vars / repo variables)

| Setting | Default | Meaning |
|---|---|---|
| `BREAKOUT_MAX_AGE_DAYS` | 30 | How "new" a repo must be to count as a breakout |
| `BREAKOUT_MIN_MOMENTUM` | 30 | Momentum floor for breakouts |
| `DIGEST_TOP_N` | 10 | How many repos in each section |
