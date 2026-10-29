# Final blocker status — Phase 9 v2

As of 2026-10-28: **BLOCKED / NOT SUBMITTED**. Basic real Twitch gameplay and the principal Codex ID are verified.
Native OBS, judge access and final submission artifacts/actions remain open. Feature freeze is active.

| Requirement | Status | Evidence / minimum next action |
| --- | --- | --- |
| Existing app configuration and OAuth | PASS | Private env0600; exact localhost callback; real consent/token validation; only `user:read:chat` |
| Real chat → authoritative game → browser | PASS, one real account | A/B inputs in separate rounds, opposite displacement, Mage/Knight wins; [live report](LIVE_TWITCH_TEST.md) |
| Momentum/decay, consequence, acknowledgment, rematch | PASS scoped | Actual samples, exact actions, zeroed rematch state; no external game change claimed |
| Team switch / repeated play | PASS scoped | Real `team locked`; two Mint pulls, distinct count1. Long-gap weights1 do not prove live cooldown/diminishing |
| Real multi-user combo / comeback | BLOCKED | Need3 distinct real accounts within3s and genuine opposition. Run existing recipe; record actual boost/reversal |
| Native OBS | BLOCKED | No accessible installed/indexed OBS. Open/install OBS, add current room source1920×1080 and execute runbook. Browser movie is not OBS proof |
| Principal Codex ID | PASS privately | Native metadata verified; actual ID retained only in ignored submission handoff, no visual `/status` claim |
| Local release regression | PASS | Rotation fix; full147/50 repeated from a source-only install without env/vault; lint/types/build and16 contrast pairs |
| Local release source | PASS | `80ff3dc` on main; clean source-only147/50, committed-history/staged/static known-secret checks clean; [repository record](qa/phase9/repository-readiness.json) |
| Judge repository access | BLOCKED | No remote/publication/access. Authorize an actual repository/push, then verify judge access and keep it available |
| Final authentic demo | BLOCKED | Private34.998333s real Twitch/browser take exists. Need OBS/multi-account/Codex takes, human narration and reviewed final<180s export |
| Public YouTube | BLOCKED | No final export/upload/URL. Obtain upload authorization; verify public signed-out playback |
| Devpost Submitted | BLOCKED | No submission authorized/performed. Provide actual links, authorize submission and verify Submitted before deadline |

## Actual release fixes

- Removed a stale localhost Worker serving obsolete API responses; current app registers none. Authorization was preserved.
- Fixed an observed cookie/CSRF race. Rotated old-cookie bootstraps receive409 without replacing cookies or renewing authority.
  Rotation markers: at most256,10s lifetime; bootstrap retries:8×250ms. Failing trace and regression tests retained.
- Native Unicode input initially duplicated drafts; only genuine posted messages and observed game decisions count as live evidence.
  Separate QA window and physical single-key events supplied the successful live tests.
- Actual uncredentialed control/key/stream requests returned401. Existing capability/Origin/CSRF/body/rate/duplicate tests pass.
  No new scope/dependency/balance/visual-system change.

Credentials previously appeared in conversation. Recommend private owner secret rotation before publication; no value is repeated
and no rotation/revocation was performed. Env/vault/private originals/traces remain excluded from Git.

## Exact local entry points

```bash
cd '/Users/sjh/Hackaton & Contest/twitch-codex-plugin-hackaton'
npm start
```

The agent's production supervisor is already running both processes; stop it before starting another copy.
Use `http://localhost:3000/dashboard/connection` for health, `/dashboard` for the actual result,
and `/dashboard/overlay` to copy the current read-only source.
OBS uses `/overlay#room=<copied capability>`; keep the fragment private and omit preview mode.

[LIVE_RELEASE_RUNBOOK](LIVE_RELEASE_RUNBOOK.md) contains OBS/recording/Git procedures.
[FINAL_SUBMISSION_AUDIT](FINAL_SUBMISSION_AUDIT.md) is the compliance authority.
No push, visibility change, upload or Devpost submission is implied by local completion.
