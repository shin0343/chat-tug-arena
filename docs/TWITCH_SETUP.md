# Twitch setup and live verification

Current Phase9v2 status,2026-10-28: **real OAuth, enabled EventSub, both-team game input, results and rematches PASS with one actual broadcaster account.**
See [LIVE_TWITCH_TEST](LIVE_TWITCH_TEST.md) for evidence and remaining multi-account/provider/OBS limits. The existing owner app is already registered and configured;
do not create another application or send credentials again. The setup instructions below also support a separate developer's fresh installation.

## Register and configure locally

1. Follow [Twitch app registration](https://dev.twitch.tv/docs/authentication/register-app/), including the account’s 2FA requirement. Create a **confidential** application in the Twitch developer console. Choose a suitable app category.
2. Register this exact local callback: `http://localhost:3000/api/auth/twitch/callback`.
   For this single URI, enter it and use the form's Save/Create action directly. Remove any empty redirect rows;
   Add is for another URI field. A blank row can trigger the misleading HTTPS validation message
   ([same-error report and explanation on Twitch's developer forum](https://discuss.dev.twitch.com/t/unable-to-use-localhost-are-redirect-url-for-oauth-implicit-grant-flow/61951)).
   Twitch's current OAuth guide still uses HTTP localhost examples. Do not change only the scheme to HTTPS: this repository's current local server is HTTP.
3. Create root `.env` from `.env.example` without overwriting an existing file. Set the following privately:

```dotenv
APP_ORIGIN=http://localhost:3000
TWITCH_CLIENT_ID=your-registered-client-id
TWITCH_CLIENT_SECRET=your-private-client-secret
TWITCH_REDIRECT_URI=http://localhost:3000/api/auth/twitch/callback
REALTIME_INTERNAL_URL=http://127.0.0.1:3001
REALTIME_HOST=127.0.0.1
REALTIME_PORT=3001
DATA_DIRECTORY=.data
SESSION_ENCRYPTION_KEY=your-64-character-random-hex-key
```

Generate the encryption key in your own terminal:

```bash
node -e 'console.log(require("node:crypto").randomBytes(32).toString("hex"))'
```

Do not send secrets in chat, commit `.env`, put it under `public/`, or expose secrets through `NEXT_PUBLIC_`.
Keep a stable key for the private vault. Changing/loss of that key prevents restoring existing sessions.
Use the exact same hostname in APP_ORIGIN, registered callback, configured redirect, and your browser.
The credential-free default uses 127.0.0.1; switch both origin/redirect to the documented localhost example for this setup.

4. Restart `npm run dev`. Open `http://localhost:3000/dashboard/connection`.
5. Select **Authorize with Twitch**. Sign into the **broadcaster account that owns the channel**, review the permission and approve. No separate bot account is required for this mode.
6. Return to the clean connection URL. The account identity appears first; **Connected** appears only after Twitch confirms the chat subscription.

For production, register the exact HTTPS callback, set APP_ORIGIN to that HTTPS origin, provide a persistent private vault path/key,
rebuild and run behind the same-origin proxy. Secure cookies are automatic with HTTPS. Keep the backend private.
The single-process/filesystem architecture has not been validated as a public production deployment.

## Minimal authorization model

The only requested scope is **`user:read:chat`**. The authorized broadcaster is both EventSub reader and target channel.
No write-chat, email, moderation, `user:bot` or `channel:bot` permission is requested.
This uses an Authorization Code **user access token**, not the separate cloud-bot app-token model.
See [channel.chat.message authorization](https://dev.twitch.tv/docs/eventsub/eventsub-subscription-types/#channelchatmessage)
and [token flow](https://dev.twitch.tv/docs/authentication/getting-tokens-oauth/).

Server validation checks client ID, scope, subject and account identity. Startup/hourly checks follow
[Twitch token validation](https://dev.twitch.tv/docs/authentication/validate-tokens/);
401 recovery follows [refresh-token guidance](https://dev.twitch.tv/docs/authentication/refresh-tokens/).
Access/refresh tokens are server-only. Browser data contains channel identity, safe status, recognized commands and CSRF only.

## Required live exit test — basic path performed, additional cases remain

With actual app credentials and a broadcaster session:

1. Confirm **Connected** and the expected channel identity; simulation must be off.
2. In that channel’s actual Twitch chat, send `!coral`, then `!mint` (or the saved custom commands). A second viewer can send the other team command.
3. Confirm the corresponding **Twitch chat** rows in Team input activity; both dashboard and connection page must show those updates. No “Test provider” banner may be present.
4. Send `hello !coral`, `!coralish`, and both commands in one message; these must not become team inputs.
5. After a recognized real input reaches EventSource, the browser acknowledges its event ID. **Download safe connection evidence** returns JSON with real source, channel, input ID, server timestamp and client receipt timestamp. Before that, `/api/evidence` returns **409 BLOCKED**.
6. Capture a screenshot showing channel/status/input only. Do not capture the developer console, OAuth callback query, cookies, `.env` or network Authorization headers. Evidence contains viewer/channel identity; review it before sharing. No real-user evidence is committed automatically.
7. Briefly interrupt network access, confirm Reconnecting and a truthful gap warning, restore it and verify a fresh message. Also revoke access in Twitch Settings → Connections and verify reauthorization recovery. These actual-provider lifecycle tests remain blocked here.
8. Record timestamp/channel, input event IDs, receipt timestamp and artifact paths in QA_PHASE_2 before changing the live gate to PASSED.

This verifies connectivity. For the Phase 3 live round gate, then prepare/start a round in the control room, use actual distinct Twitch
viewers, copy the room-linked arena source from OBS setup, verify shared clock/rope/result and test pause/reconnect/explicit resume.
The basic real Twitch round passed with one broadcaster account in Phase 9 v2; see LIVE_TWITCH_TEST.
Native OBS/CEF and genuine multi-account combo/comeback verification remain separate, unperformed checks.

For the Phase 5 workflow, open Showdown setup after connecting, select/edit a template, question, both choices/keywords,
duration, consequence and start condition, then Save showdown. This saves for the current server session and prepares it when
the source is ready. If a fresh-command check is enabled, send one of the configured commands **after preparation**, then Start showdown.
Use distinct viewers for the actual game. At finish, verify the exact winning action on both dashboard and OBS, commit to the choice,
make the change yourself in your game and Rematch. “Committed” is not proof of an automatic integration or completed action.
The dashboard's recent-command feed is expandable; open Recent recognized commands when checking transport evidence.

## Recovery guide

| What you see | Action |
| --- | --- |
| Not connected / missing credentials | Add private app credentials and restart both processes |
| Authorization required | Start authorization from the current connection page |
| Denied, expired link or state mismatch | Start again in the same browser; stale callbacks cannot authenticate |
| Connecting | Wait for actual subscription approval; check network/provider if it becomes a failure |
| Reconnecting | Automatic retry/handoff is active; messages during gaps cannot be replayed |
| Authorization expired / revoked / missing scope | Authorize again and grant read-chat access |
| Connection failed | Use Resume Twitch connection if still authorized; otherwise authorize again |
| Updates unavailable | Check both local processes and matching origins; Retry updates. This is not a green Twitch state |
| Simulation mode | No Twitch ingestion. Stop/replay the local run or Resume Twitch connection |
| Secure storage failure | Check directory permissions/key; a wrong key must not silently replace the vault. If disconnect could not be saved, remove the app in Twitch Connections before restarting against an older vault |
| Revocation unconfirmed | Local ingestion stopped; remove the app in Twitch Settings → Connections |

## Operations and limitations

- Chat transport follows [official EventSub WebSocket lifecycle](https://dev.twitch.tv/docs/eventsub/handling-websocket-events/). Unexpected loss requires resubscription; Twitch handoff transfers subscriptions.
- Use one control session per channel during the hackathon to stay within Twitch socket limits. Multiple tabs sharing the cookie share a room; unrelated browser profiles do not.
- Keep `/api/events` unbuffered with `Cache-Control: no-store, no-transform`; preserve backend headers at any additional proxy. Proxy idle timeouts must allow the 15s heartbeat.
- Anonymous pending authorization is in memory and must be restarted after a backend restart. Authorization persists only with the encryption key; current activity history is intentionally memory-only.
- The source has no alternate-provider URL or fake authentication endpoint. Automated gateway fixtures are explicitly marked and live evidence rejects them.
- Phase9v2 obtained real authorization privately and verified actual chat/gameplay. Real refresh/revocation, directed handoff and an hours-long provider soak remain unverified;
  the actual backend restart restored authorization/subscription. Never substitute fixtures for these remaining cases.
