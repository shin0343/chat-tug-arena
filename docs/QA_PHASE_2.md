# Phase 2 verification — Twitch connection and realtime input

Date: 2026-10-27. Local macOS, Node/npm workspaces, Chromium through Playwright.

## Exit gate

**Real Twitch chat → normalized team event → realtime browser update: BLOCKED.**

Root `.env` was absent and TWITCH_CLIENT_ID / TWITCH_CLIENT_SECRET were not configured.
No actual OAuth consent, Twitch token, broadcaster channel or real chat message was used.
No live evidence artifact or real-connected screenshot is claimed. Configure and execute
the exact manual test in [TWITCH_SETUP.md](TWITCH_SETUP.md) before changing this gate.
The exported evidence API also rejects simulation and test fixtures with 409 BLOCKED.

## Executed checks

| Command / environment | Result |
| --- | --- |
| `npm run check` | PASS: lint, typecheck, Vitest, contrast and production build |
| `npm test` | PASS: **47 tests across 5 files**; actual local HTTP/SSE and injected provider/socket fixtures |
| `npm run contrast` | PASS: all **16 semantic pairs**; existing palette retained |
| `npm run test:e2e` on dev | PASS: **26 tests** in Chromium |
| `npm start` + `npm run test:e2e` on production | PASS: **27 tests** in Chromium; actual Next rewrite and persistent Node server, including maximum-length command regression |
| Screenshots | **30 first-party PNGs** in `docs/qa/phase2`; required desktop/mobile surfaces and labeled fixture states |

The final copy changes additionally distinguish unavailable/unknown status from empty activity and encrypted persistence;
lint, types, build and the production browser suite were rechecked after those changes.
Playwright’s NO_COLOR/FORCE_COLOR warning is test-runner environment output, not an app error.
No browser page/console errors occurred in the all-routes smoke test.

## Functional evidence and its limits

- OAuth: missing credentials, authorization-code request, one scope, form exchange, provider errors, wrong/expired/replayed state,
  denied consent, channel subject mismatch, clean callback redirect, session/CSRF rotation, logout and failed-persistence rollback.
- Token manager: concurrent 401s share one refresh, rotated credentials persist, another user’s refreshed token is rejected,
  and unrecoverable authorization clears the connection. These are fixtures, not actual provider refreshes.
- Vault: ciphertext does not contain raw cookie/access/refresh/channel values, file permission is 0600, correct-key restore works,
  wrong-key restore fails. Configured production rejects a missing key; the supervisor propagates NODE_ENV=production.
- EventSub fixtures: welcome + confirmed subscription required, early-chat buffering, handoff without re-subscription,
  unexpected-loss new connection + re-subscription, keepalive watchdog, five-retry exhaustion, revocation, invalid data,
  duplicate envelopes, foreign-channel rejection, trusted reconnect URLs and shutdown without resurrection.
- HTTP integration: genuine cookie/Origin/CSRF enforcement, field-specific command errors, session isolation, forbidden public WS,
  safe callback redirects and the full OAuth → fixture EventSub → typed `game.input` → real SSE client chain.
- Actual local simulation: native EventSource through the running Next proxy receives Node-published events. Four users,
  both teams, bursts, quiet periods, a dropped-input gap, invalid messages and duplicates produce the same sequence each time.
  Final counts: **10 recognized, 3 ignored, 1 duplicate, 1 invalid**. None are Twitch activity.
- Browser: command validation/save/reload, history across navigation, stop/exit simulation, outage recovery,
  late HTTP response cannot overwrite newer stream revisions, and feed loss removes connected confirmation.
- Foundation regression: round validation/local storage failure, genuine clipboard success/failure, disabled live start,
  transparent overlay, keyboard skip link, reduced motion and routes at **320/390/768/1024px**.

## Screenshots inspected

All paths below are under `docs/qa/phase2/`. Fixture files prominently say **Test provider**;
they demonstrate rendering only and must not appear in a submission as actual Twitch verification.

| Surface | Evidence |
| --- | --- |
| Landing and local manual demo | `landing-desktop.png`, `landing-390.png` |
| Empty control room and received simulation activity | `dashboard-desktop.png`, `dashboard-simulation-desktop.png`, `dashboard-390.png`, `dashboard-1024.png` |
| Maximum supported command length at 320px | `dashboard-long-commands-320.png` (actual saved session commands) |
| Real disconnected/missing-credential connection page | `connection-desktop.png`, `connection-390.png` |
| Round configuration | `round-desktop.png`, `round-390.png` |
| Setup and standalone OBS shell | `setup-390.png`, `overlay-setup-desktop.png`, `overlay-setup-390.png`, `overlay-transparent.png`, `overlay-preview.png` |
| Actual local simulation progress/completion | `simulation-gap-desktop.png`, `simulation-complete-desktop.png` |
| Server unavailable and recovery | `server-unavailable-desktop.png` |
| All eight fixture states | `fixture-<state>-desktop.png` for not_connected, connecting, authorization_required, connected, reconnecting, authorization_expired, connection_failed, simulation |
| Fixture small layouts | `fixture-connected-390.png`, `fixture-reconnecting-390.png`, `fixture-authorization_expired-390.png` |

Visual review checked operational hierarchy, legible team commands, status/identity separation, action placement,
calm panels, existing fonts/tokens, wrapped badges and small-screen boundaries against DESIGN.md and the inspected references.
The overlay keeps the original broad, playful broadcast composition; the control room remains compact and quiet.
No new palette, gradients, decorative art, mascot, animation, metrics or third-party assets were added.

## Defects found and fixed

1. **SSE delayed by Next gzip:** direct Node delivered the first frame immediately; the proxy added gzip and buffered it.
   `Cache-Control: no-store, no-transform` fixes the cause. Real browser startup and input tests now verify immediate delivery.
2. **Save confirmation disappeared:** a command-derived React key remounted the form on save. Stable form identity now retains its draft/result.
3. **Response-order race:** an older HTTP action response could replace newer SSE state. Revision checks reject stale updates; a delayed-response regression verifies it.
4. **Stale green connection:** client update loss now removes the connected confirmation and exposes Retry updates rather than trusting the last snapshot.
5. **Unknown versus empty/security status:** unavailable activity and unconfirmed storage are explicitly named; loading cannot claim encrypted persistence.
6. **Capture-only sticky artifact:** full-page capture after scrolling included an offscreen fixed skip link/sticky offset.
   Captures now scroll to the top first. The real keyboard skip link remains usable; it was not removed to improve screenshots.
7. **Missing exit/revoke controls:** completed simulation now has Exit simulation; authorized accounts can disconnect even after transport failure or when simulation is active.
8. **Shutdown after storage failure:** a real filesystem failure reproduced an open HTTP listener after the vault close rejected.
   Listener cleanup now runs in `finally`; the regression first failed, then passed after the fix.
9. **Maximum-length command overflow:** a 320px browser probe measured 385px document width and clipped team text.
   Team command labels now wrap within their columns, and the command-note row wraps. Tests check text-range bounds as well as document width.

## Security observations and remaining limitations

Only `user:read:chat` is requested. OAuth uses a confidential server exchange, one-time session-bound state,
HttpOnly/SameSite cookie, exact-origin + CSRF controls (rechecked after queued session rotation), no-store API responses,
clean callback return and fixed safe error codes. Access/refresh tokens remain server-side; no private token is put in a URL,
browser storage, screenshot or browser log. A short-lived OAuth authorization code necessarily arrives at the callback and is immediately removed by redirect.
Next request logging is disabled; a future external proxy must also omit callback query strings.

The evidence endpoint requires a real-origin recognized input and matching browser acknowledgement;
its receipt time is the server’s acknowledgement timestamp, not a synchronized browser clock or a cryptographic attestation.
Exported identity/event data should be reviewed before sharing. No real-user evidence was saved automatically.

The encrypted file store is one persistent process/filesystem, with 12-hour session TTL and bounded sessions/streams/history.
It is not multi-instance storage. Without a key, local authorization is memory-only. Pending anonymous OAuth and input history
are not restored. Storage failure and unconfirmed provider revocation need operator recovery; if a disconnect could not be saved,
remove the app in Twitch Connections before restarting against an older vault.

Real OAuth consent/scopes, real refresh/revocation, real network recovery, a live chat soak, deployment/TLS proxy behavior,
Safari/Firefox, native OBS/CEF and first-time streamer usability were **not verified**.
No live game engine, per-user cooldown application, scores, synchronized round clock or room-linked OBS exists yet.

## Phase 3 readiness

Typed inputs, source labels, session connection lifecycle and realtime publication are ready for the authoritative game engine.
The live-provider gate remains BLOCKED and must be cleared before claiming Twitch eligibility or a complete real round.
Phase 3 should preserve DESIGN.md, keep control credentials out of overlay URLs, add a read-only room capability,
then implement game rules, clocks and dashboard/OBS synchronization. Phase 3 was not started.
