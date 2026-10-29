# Security review — Phase 7

**Phase9v2 update:** real credentials/consent and single-account Twitch gameplay are now verified; current limits/evidence are in LIVE_TWITCH_TEST.
No secret values appear in that report. Earlier no-credentials statements below describe the historical Phase7 audit.

Reviewed 2026-10-27/28 (America/Los_Angeles/UTC). **Local source and automated security checks completed; public production sign-off is BLOCKED.**
No confirmed high/critical security vulnerability was found in the reviewed paths. This is a scoped engineering review, not an independent penetration-test certification.

## Scope and evidence

Read OAuth exchange/validation/refresh, session vault, EventSub, normalizer, engine/controller, HTTP/SSE boundaries, public projection,
client connection provider, Next rewrites/headers, dependency manifests/lock and relevant tests. The `gstack:cso` review procedure was used;
its independent verifier rejected the stale-CSRF candidate as a security vulnerability: it causes failed controls, not authority escalation.
User authorization covered implementing confirmed reliability fixes. No credentials, external accounts, production target, git history or CI configuration were available.

Evidence: [full checks](qa/phase7/logs/check.txt), [dependency audit](qa/phase7/logs/npm-audit.json),
[redacted source-pattern scan](qa/phase7/source-secret-scan.json), [load](qa/phase7/load.json),
[before-race failure](qa/phase7/regression/session-race-before.txt), [before-stream failure](qa/phase7/load-before.txt).

## Trust boundaries verified

| Boundary | Actual verification | Result / limit |
| --- | --- | --- |
| OAuth start/callback | Unit/HTTP fixtures test exact state, expiry, denial, replay, identity mismatch, code exchange, private secrets, cookie rotation | PASS locally; actual Twitch consent/exchange BLOCKED |
| Token validation/refresh | Startup/hourly path read; tests cover audience/subject/scope, one concurrent refresh, provider failure and wrong-user refresh | PASS fixtures; real expiration/revocation BLOCKED |
| Server secrets | Fixed Twitch endpoints; secret in server-side POST, no raw provider body in errors; no browser token storage or public env secret | PASS reviewed source/tests; real-secret operational review BLOCKED |
| Vault | AES-256-GCM, authenticated format, random IV, atomic write, 0600/0700; tests reject wrong key/corruption and rollback failed auth persistence | PASS local filesystem tests; hosted storage/backup policy BLOCKED |
| Privileged HTTP | Cookie + exact Origin + CSRF; checked again inside per-session lock; stale round/state/settings rejected | PASS local HTTP including a queued request across rotation |
| Public overlay | Separate random capability; fragment → Authorization header; `credentials: omit`; no session cookie, viewer IDs, private input feed, history or CSRF in public state | PASS local HTTP/browser |
| Public writes | Every one of 21 privileged POST routes rejects bearer-only overlay access with 401; forged result endpoint rejected | PASS actual local requests |
| Private/public SSE | Cross-site/origin checks, six streams per class, no-transform, release capacity after close, rotate/revoke capability | PASS local HTTP; TLS/proxy deployment BLOCKED |
| WebSockets | Browser upgrade is rejected with 403; Twitch server socket is outbound only | PASS actual local upgrade test |
| Input/body limits | Malformed JSON 400; >4096-byte body 413; command/config validation; 30 actions/min/session then 429 without mutation | PASS actual local requests |
| Chat fairness | Bounded IDs/users/receipts/events, exact normalized commands, duplicate/channel/source/late checks, cooldown, team lock, repeat weights, token bucket | PASS deterministic/fixture tests and load; not an unlimited-ingress guarantee |
| XSS | No `dangerouslySetInnerHTML`/HTML evaluation in reviewed app paths; actual malicious-looking title and choice remain literal React/SVG text in dashboard/public source | PASS browser regression |
| Sensitive logging | Startup/error messages reviewed; fixture token leakage assertions; no real secret printed or captured | PASS reviewed paths; no external log service to inspect |
| Dependencies | `npm audit --json` and fresh-install audit: 0 known advisories at run time; lockfile; build-script entries inspected | PASS dated advisory check, not a future guarantee |

The source-pattern scan inspected 193 text files for four known key formats and emitted no matches or secret values.
It excludes private env/vault and historical QA media. `gitleaks` was unavailable, and there is no `.git` history to scan.
Twitch tokens have no dependable prefix; pattern scanning alone cannot prove their absence. Server-only data paths and projections were inspected separately.
Dev `localStorage` retains only legacy preview configuration, never authorization or authoritative showdown state.

## Confirmed defects fixed

| Priority / ID | Reproduction and impact | Fix and verification |
| --- | --- | --- |
| P1 R7-01 — stale control token | Hold a successful commands response; rotate via real disconnect; let SSE bootstrap fresh session; release held response. Next simulation action returned 403 | Provider applies a response only while its captured CSRF still belongs to the current bootstrap. Before failure and after screenshot retained; regression passes. Server cookie/Origin/CSRF enforcement was never bypassed |
| P1 R7-02 — SSE interruption under load | Initial 120s real HTTP/SSE fixture-load run ended the dashboard stream unexpectedly | `response.write(false)` now waits for drain instead of immediately disconnecting. One latest snapshot is retained; a 5s drain timeout bounds stalled consumers. Three focused tests verify coalescing, timeout cleanup and reset. Same 120s load passes with all seven streams alive |

Both are reliability defects. No speculative privilege-escalation severity is assigned. Physics, winners, art, tokens and scopes are unchanged.

## Remaining release risks

| Priority | Risk / evidence | Required resolution |
| --- | --- | --- |
| P0 external gate | Real authorized Twitch input has not reached this browser; no root `.env` or process credentials | Complete [live protocol](LIVE_TWITCH_TEST.md); fixtures cannot clear it |
| P1 deployment | Anonymous session creation has a global cap of 256 and 12h expiry; action limits do not govern new-session ingress | Before public hosting, define and test edge admission/rate policy. Backend loopback default is not a public-host availability test. No trusted-proxy/IP-header assumption was added during QA |
| P1 operations | One process/private filesystem; rooms/history/overlay keys are ephemeral, and sustained provider/host recovery unverified | Use one instance for judging; supply stable private vault/key, exact HTTPS origin and unbuffered same-origin proxy; verify host/restart/revoke workflow |
| P1 external gate | No native OBS/CEF, real credential lifecycle, hours-long soak or judge-access environment | Complete actual external checks; do not label local tests production certification |
| P2 provenance | No git metadata/remote/CI in this supplied folder; no project-wide license choice | Audit eventual repository history/artifacts, retain dependency/font notices and establish permitted judge access |

A vault write/revocation failure is deliberately surfaced as a notice. Follow the existing recovery guide before restarting an older vault;
remove the integration from Twitch Connections when revocation is unconfirmed. A short soak does not establish memory-leak freedom.
No runtime LLM, SQL database, upload surface, inbound EventSub webhook, deployment pipeline or repository-local agent skill exists to audit here.

## Primary sources

Reopened [Twitch validation](https://dev.twitch.tv/docs/authentication/validate-tokens/),
[EventSub WebSockets](https://dev.twitch.tv/docs/eventsub/handling-websocket-events/) and
[official hackathon rules](https://twitchcon-codex.devpost.com/rules).
Startup/hourly validation and provider-directed socket recovery were compared with the implementation; this is source conformity evidence, not live-provider execution.

No public deployment, external messaging, token rotation against Twitch, publishing or submission was performed.

## Phase9v2 release review

The owner-authorized live test used the existing registered confidential app and only user:read:chat. Credentials were kept in ignored0600 env;
authorization remained in the AES-GCM private vault. Known actual app/key/token values were checked in memory against publication candidates,
with no values printed. Private recordings/traces remain ignored. The secret's earlier conversation exposure warrants private owner rotation
before publication; no revoke/rotation was performed. Genuine test chat messages were explicitly authorized by the live-test task.

Browser trace generations proved an early reset could create cookie2 while the intended rotation committed cookie1, producing a cookie/CSRF mismatch.
This was a reliability failure, not privilege escalation. A bounded256-digest/10s marker prevents replacement-cookie creation on stale bootstraps;
409 retries are8×250ms. Stale cookies still receive401 on streams and no session data, CSRF or renewed authority.
The deterministic before/fix regression, expiry/bound test, existing queued-authority checks and50 browser checks passed.

Actual unauthenticated overlay-key/events/overlay/control requests returned401; no public capability grants streamer controls.
Fresh npm audit reported0 known vulnerabilities. Final Git staging/history and current frontend static-file scans must remain clean;
no remote visibility, push, upload or Devpost submission is authorized by this review.

## Public GitHub source gate

The owner authorized public publication. Public source was cloned with credential helpers and global/system Git configuration disabled; README/page returned200 and private .env404.
Known Client ID/Secret, encryption/access/refresh/CSRF values and the private Codex identifier were checked in memory against public source, with0 matches.
Only sanitized main history is public; the earlier history and principal identity proof remain in an ignored private bundle/handoff.
No project secret was rotated/revoked here. Owner rotation of the conversation-shared app secret and post-rotation smoke testing remain pending.
[Actual publication scope](qa/final-release/publication.json).
