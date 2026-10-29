# Live release runbook — Phase 9 v2

Decision: **BLOCKED for submission**, with the basic real Twitch workflow verified.
Use [current blockers](FINAL_BLOCKER_STATUS.md), [live evidence](LIVE_TWITCH_TEST.md) and the [submission audit](FINAL_SUBMISSION_AUDIT.md).
Feature freeze: integration/security/demo blockers only; preserve the approved design and engine.

## 1. Confirmed Twitch configuration

The existing app is registered. **Do not register a second app or request credentials again.**

| Item | Implemented / tested value |
| --- | --- |
| Client type | Confidential; server Authorization Code grant, state validation, forced consent |
| Registered callback | `http://localhost:3000/api/auth/twitch/callback` — matched actual developer-console entry |
| Connection UI | `http://localhost:3000/dashboard/connection` |
| Scope | Only `user:read:chat`; read the authorized broadcaster's own channel |
| Subscription | `channel.chat.message` v1; reader and broadcaster IDs both the authorized user; WebSocket welcome session binding |
| Token | User access token, server-only; secret exchange/refresh and encrypted private vault |
| Backend | Persistent Node, `127.0.0.1:3001`, owns Twitch,20ms physics and SSE |
| Frontend | Next on3000; same-origin API proxy; both processes must run |
| Source | Current room-linked `/overlay#room=<copied capability>`; no preview query |

All local configuration was PRESENT and the private env mode was0600. Required names:
`TWITCH_CLIENT_ID`, `TWITCH_CLIENT_SECRET`, `SESSION_ENCRYPTION_KEY`, `APP_ORIGIN`, `TWITCH_REDIRECT_URI`,
`REALTIME_HOST`, `REALTIME_PORT`, `REALTIME_INTERNAL_URL`, `DATA_DIRECTORY`.
A Client Secret is required. No channel-name env or browser-public secret variable is used.

The nonsecret local settings are:

```dotenv
APP_ORIGIN=http://localhost:3000
TWITCH_REDIRECT_URI=http://localhost:3000/api/auth/twitch/callback
REALTIME_HOST=127.0.0.1
REALTIME_PORT=3001
REALTIME_INTERNAL_URL=http://127.0.0.1:3001
DATA_DIRECTORY=.data
```

Keep the encryption key stable. The vault resolves under `apps/realtime/.data`.
The secret was shared in conversation: recommend owner rotation privately before external release, then update only the ignored env.
No credential has been rotated/revoked by this task. Do not put any credential in chat, screenshots, logs or source.

[Twitch OAuth](https://dev.twitch.tv/docs/authentication/getting-tokens-oauth/#authorization-code-grant-flow),
[chat subscription](https://dev.twitch.tv/docs/eventsub/eventsub-subscription-types/#channelchatmessage).

## 2. Startup and actual connection

The production supervisor is already running. Do not start a competing instance.
To restart its owning terminal: Ctrl+C, wait for both children to stop, then:

```bash
cd '/Users/sjh/Hackaton & Contest/twitch-codex-plugin-hackaton'
npm start
```

This one command loads the root env and starts frontend/backend. After a source/internal-proxy change run `npm run check`
before `npm start`; a credential-only change needs restart, not a rebuild.
A fresh checkout uses `npm ci` → private configuration → `npm run build` → `npm start`.

Real broadcaster approval has completed. Open the connection UI and require **Connected**, not just an identity.
If approval is lost, select **Authorize with Twitch** and use Twitch's real login/consent; password/2FA stay there.
Main Twitch chat can require a separate website login even when developer/OAuth sessions are signed in.

Troubleshooting:
- Verify both processes and matching localhost origin/callback.
- If only this Chrome profile returns obsolete API data, inspect Application → Service workers. This app registers none.
  An old localhost root Worker was actually removed during QA; do not delete unrelated origins or authorization cookies.
- After a build, reload old tabs so they use the new assets.
- The rotation race fix waits for the committed cookie:409 transient bootstrap,8 retries at250ms; no old-cookie control access.
- Real server restart restored encrypted authorization and re-established a real subscription; rounds/history/source keys reset.
  Copy a new source URL after restarting.

## 3. Actual live checks and remaining provider work

Tested setup: Mage/Knight, `!coral`/`!mint`,90s,2s cooldown, connection-ready manual start.
Same broadcaster in different rounds produced Coral x=-0.0793 and Mint x=+0.0793, with correct winners/actions.
Real long-gap repeated Mint pulls and a rejected team switch were observed. Full numbers and limits are in LIVE_TWITCH_TEST.

For the next coordinated take:
1. Open `/dashboard/round`, `/dashboard`, and `/dashboard/overlay` on localhost in the same browser profile.
2. Save/review the actual choices/keywords and copy the current source. Keep Simulation off.
3. Start, wait until ACTIVE, then send the exact command through actual Twitch chat.
4. Confirm Twitch-labelled recognition **and accepted game decision**, changed force/position and source movement.
   Connection-only `/api/evidence` is not proof of an accepted ACTIVE pull.
5. First accepted pull fixes that account's crew for the round. Use another round/account for the opposite direction.
6. Three distinct real accounts on one crew within3s trigger1.25×. Six/ten unlock1.5×/1.75×.
   Do not invent users or feed test-input endpoints. A single account cannot prove a live combo.
7. Stop inputs to observe decay; let genuine opponents build a reversal before an endpoint.
   A momentum swing alone is not necessarily a COMEBACK event.
8. Inspect actual winner/action on both surfaces, acknowledge in-app, then rematch and verify reset.
   Perform a real game change only if genuinely possible; acknowledgment records a promise.
9. For an expendable round, test real provider loss/recovery and explicit Resume; gap messages are not replayed.

Same-text messages have new Twitch IDs. Only actual redelivery can clear the live same-ID gate.
Live inside-cooldown/diminishing behavior, real expired/revoked credentials, directed handoff and long soak remain separately unverified.
Do not revoke credentials to manufacture a test without authorization.
The lab may observe a real round, but Run scenario/test pulls are simulated and must not be used as live evidence.

## 4. OBS — manual native gate

OBS was absent from common app paths and exact indexed-app lookup. **No native OBS/CEF test occurred.**
Current browser/source checks and the private genuine Twitch browser movie do not clear this gate.

| Browser Source property | Required starting setting |
| --- | --- |
| URL | Copy arena source URL from `http://localhost:3000/dashboard/overlay`; current room fragment, no `preview=1`; Local file off |
| Dimensions |1920×1080; also inspect1280×720; fit16:9 without cropping/stretching |
| FPS | Request60 if supported; measure actual behavior, test30 if needed. No native FPS result exists |
| Background | Default transparent CSS; opaque field/HUD backplates are intentional |
| Placement | Above an owned color/game source; preserve5% side margins |
| Shutdown while hidden | Off during live play |
| Refresh on activation | Off for continuous takes; manually refresh for recovery test |

Verify real transparency, no scrollbars/clipping, readable teams/keywords, grounded poses, both rope directions,
combo/final countdown, winner/action and refresh restoration. Record OBS version/settings and actual native capture.
A Browser Source refresh preserves the server round; backend restart clears it and requires a new copied URL.
Reauthorization/disconnect also rotates source access. Reduced motion intentionally suppresses smooth effects.
[Official OBS source properties](https://obsproject.com/kb/browser-source).

## 5. Reliable recording

Use [167s script](DEMO_SCRIPT.md) and [shot ledger](DEMO_SHOT_LIST.md).
A private34.998333s real Twitch/browser QA take exists; it is not the final demo or native OBS footage.

- Arrange consenting real participants: ideally three per crew. One broadcaster alone can show separate directional rounds,
  fairness and consequences but cannot supply unique-viewer combo/comeback footage.
- Use the actual tested `!coral`/`!mint` and90s configuration, or visibly configure/retest any other recipe.
- Record genuine chat, countdown and source together. A disclosed manual Finish can shorten a take while preserving server result authority.
- For reversal, build a moderate lead (e.g. x≈-0.35 to-0.55), pause that crew's input and cue real opposition before the endpoint.
  Outcome is not guaranteed; use the result/event that actually occurred.
- Capture the principal Codex thread's architecture/physics/testing work. **Do not film the turn containing the app secret.**
- Keep env, callback parameters, developer-console credentials, cookies, Authorization headers and source fragment outside captures.
- Preserve originals privately, record human English narration, edit around the actual winner. No unlicensed game/music/stock footage.

```bash
ffprobe -v error -show_entries format=duration -show_entries stream=codec_name,width,height -of json .local-evidence/chat-tug-demo.mp4
shasum -a 256 .local-evidence/chat-tug-demo.mp4
```

The final file above does not yet exist. Require<180s, full playback/privacy/rights review, readable captions and actual Twitch/Codex footage.
No upload is authorized.

## 6. Codex identity

The principal ID was verified against native root-thread metadata and retained in the ignored private submission handoff.
Use the actual private value in the Devpost session field; no identifier is published here.
This is not a claim that `/status` was visually inspected or recorded.
Open the same conversation and enter `/status` in Codex's composer, not zsh; compare the thread field if exposed.
The maintainer can resume the original CLI thread using the private handoff; public setup instructions do not require it.

Never substitute EventSub session ID, app cookie, overlay key or a helper thread.

## 7. Repository and judging

The owner explicitly authorized public GitHub publication. The source is now [https://github.com/shin0343/twitch-codex-plugin-hackaton](https://github.com/shin0343/twitch-codex-plugin-hackaton) on main.
Unauthenticated page/README access and a complete credential-free clone passed; [publication evidence](qa/final-release/publication.json) records the verified source revision.
The source-only install/check previously passed147/50. Fresh lint/build passed and107 production/test/config files matched that tested source.

The earlier local-only commits were retained in an ignored private bundle. Public main starts from a sanitized source snapshot;
actual app credentials, the principal Codex identifier, env/vault and raw recordings are absent from public files and public history.
No source history was backdated or fabricated. Use the maintainer's private handoff for the required Devpost session field.

```bash
git clone https://github.com/shin0343/twitch-codex-plugin-hackaton.git
cd twitch-codex-plugin-hackaton
npm ci
cp -n .env.example .env
chmod 600 .env
npm run dev
```

The existing checkout already has origin and main tracking configured. Source/assets/notices/instructions must remain accessible through judging.
The project-wide open-source license remains unchosen; font licenses and existing rights are preserved.
Public source access does not authorize video upload or Devpost submission, and it does not imply a deployed application.

## 8. Submission gate

English draft and actual session ID exist. The actual judge repository URL is verified. Final YouTube and actual Codex/live production takes
and Devpost Submitted status remain missing. Obtain separate upload/submission authorization and verify actual external outcomes.
Rechecked [official rules](https://twitchcon-codex.devpost.com/rules) and [resources](https://twitchcon-codex.devpost.com/resources).
Deadline: **2026-11-02 14:00 America/Los_Angeles / PST,22:00 UTC**.
Do not modify submitted materials after the deadline.
