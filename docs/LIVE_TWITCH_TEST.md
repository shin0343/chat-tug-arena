# Live Twitch test — Phase 9 v2

Updated 2026-10-28. **PASS for the basic real Twitch game workflow with one actual broadcaster account.**
This supersedes the previous missing-credentials/consent status. Multi-account combos, a real comeback, native OBS and several provider failure cases remain **BLOCKED**.

## Actual environment

The existing confidential app uses `http://localhost:3000/api/auth/twitch/callback` and only `user:read:chat`.
Real consent completed in Chrome; server token validation and Helix confirmed an enabled self-channel `channel.chat.message` v1 WebSocket subscription.
The browser displayed **Connected / Chat subscription confirmed by Twitch**. Tokens remained server-side in the encrypted vault.
No second app, extra permission, simulated user or test-input endpoint was used for these live checks.

A pre-existing localhost Service Worker intercepted API responses. Current source has no Worker and `/sw.js` returns404.
Removed the stale local registration and reopened its controlled tab, retaining authorization cookies.
A separate cookie/CSRF rotation race was reproduced and fixed; see [security review](SECURITY_REVIEW.md).

## Performed live journey

| Check | Result | Actual observation |
| --- | --- | --- |
| Frontend/backend and OAuth | PASS | UI3000, private service3001, real consent and enabled subscription |
| Configuration | PASS | Saved Mage/Knight, `!coral`/`!mint`, 90s, 2s cooldown, connection-ready start |
| Start/countdown | PASS | Server-confirmed countdown and active Twitch round |
| Team A | PASS | Genuine `!coral`; one accepted weight1 pull, one participant; final x=-0.0793 |
| Team B | PASS | Fresh round, genuine `!mint`; one accepted pull; final x=+0.0793 |
| Decay/momentum | PASS measured | Mint force0.052→0.015→0.004; velocity0.0050→0.0013→0.0003; position0.0708→0.0771→0.0787 |
| Pause/resume | PASS scoped | Coral round paused at19s remaining, showed frozen clock/rope, resumed and completed |
| Time/result/consequence | PASS scoped | Actual time-based Mage/Knight wins and exact next actions on the dashboard; overlay contract/fixtures pass, native OBS remains separate |
| Commitment | PASS | Actual in-app acknowledgments unlocked rematches; external game changes were not performed |
| Rematch isolation | PASS | Position, speed, forces, participants and applied pulls reset to0 before new input |
| No participation | PASS | Quiet real rounds produced no winner or forced consequence |
| Team switching | PASS | Mint user's subsequent `!coral` rejected as `team locked`; Coral applied count stayed0 |
| Repeated participation | PASS scoped | Same user supplied two accepted Mint pulls, distinct count1; long-gap weights were1 |
| Live diminishing / inside-cooldown rejection | BLOCKED | Actual intervals exceeded their windows; automated rules pass, but these were not demonstrated live |
| Ordinary/similar command | PASS | Genuine `hello !coral` and `!coralish` posted; recognized stayed6 and ignored became2 |
| Same-ID provider redelivery | BLOCKED | No real redelivery observed; repeated text creates a different Twitch message ID |
| Distinct-user combo / comeback | BLOCKED | Only one genuine account participated; need at least3 real accounts for a combo and genuine opposition |
| Restart/recovery | PASS scoped | Existing encrypted authorization restored; subscription re-enabled and new real chat reached the game |
| Directed handoff / forced network gap | BLOCKED | Real provider migration/gap not exercised |
| Native OBS | BLOCKED | No accessible installed/indexed OBS; regular-browser evidence is separate |

The same broadcaster tested opposite directions in different rounds. This is not evidence of multiple viewers or a live combo.
Long-gap repeats prove continued participation, not live diminishing-return or spam stress behavior.
The connection UI also counted one invalid item and zero duplicate rejections. Its reason was not captured;
do not describe this run as zero provider errors or a completed long-running reliability audit.

## Evidence

- [Provider status](qa/phase9/live-twitch-subscription.json): status/scope/condition checks; no credentials or account IDs.
- [Actual physics samples](qa/phase9/live-physics-samples.json): native browser observations of genuine Twitch decisions, force, speed and position; identities omitted.
- [Real Coral result screenshot](qa/phase9/live-coral-mechanics.png): the lab inspected an existing Twitch round; no scenario was run.
- [Unauthenticated HTTP checks](qa/phase9/live-http-boundaries.json).
- [Real input counter observations](qa/phase9/live-input-observations.json).
- [Sanitized failing rotation trace](qa/phase9/rotation-race-before.json), [release checks](qa/phase9/release-check.txt), [browser checks](qa/phase9/browser-release-tests.txt).
- Private originals: `.local-evidence/real-chat-key-tests.jsonl`, `live-coral-mechanics.png`, `live-twitch-mint-round.mov`.
  The actual browser-region movie is **34.998333s, 1464×1720, H.264**. Six sampled frames were inspected.
  It shows real chat and following movement/decay. It is a raw QA take, not native OBS, a final167s demo or an upload.
  Encoded frame rate is not renderer FPS. Originals remain private pending review.
- [Separately simulated seed42 scenarios](qa/phase9/scenarios.json): all seven reran. Simulated comeback: minimum x=-0.631972,
  Mint endpoint at41.70s. This does not clear the real comeback gate.

Fresh checks: **147 unit/integration tests, 50 production Chromium tests, lint, types,16 contrast pairs and build PASS**.
Initial failures and fixes remain in the build log. None of these test counts represent real viewers.

## Remaining provider work

Invalid/expired/revoked credentials, directed EventSub migration, same-ID redelivery and an hours-long live soak remain unverified.
Use [LIVE_RELEASE_RUNBOOK](LIVE_RELEASE_RUNBOOK.md) for multi-account/native OBS procedures.
The app secret was shared in conversation: recommend private owner rotation before publication, updating only the ignored `.env`.
No secret value is repeated here; no rotation/revocation or external publication occurred.

## Public source follow-up

Public source/README are now available and anonymously clone-verified; see [publication evidence](qa/final-release/publication.json).
This action does not add post-secret-rotation or multi-account live proof. The actual principal Codex identifier is retained privately for Devpost.
The owner selected macOS/Recordly browser recording because OBS is absent; native browser result footage is not native OBS or a completed final demo.
