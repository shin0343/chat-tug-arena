# Devpost submission — English draft

Prepared 2026-10-28. **DRAFT / BLOCKED FOR PUBLICATION.** Local application behavior is verified in
[FINAL_QA_REPORT](FINAL_QA_REPORT.md). Real one-account Twitch gameplay and a private raw browser take now exist; native OBS,
multi-account footage, actual Codex footage and the final demo remain missing. Public repository access is now verified.
Do not paste this as an already submitted or live-verified entry. Review the limitations with the final footage before publishing.

## Project name

Chat Tug Arena

## Tagline

Turn chat into a pulling crew. Let the winner decide what happens next.

## Inspiration

A poll can tell a streamer which option won. We wanted the decision itself to become something viewers could watch and influence together:
a rope accelerating when a crew joins in, slowing when they stop, and changing direction when the other side coordinates a response.
The idea of chat voting or tug-of-war voting is familiar. Our focus is the combination of readable momentum, distinct-viewer teamwork
and a specific action the streamer commits to afterward.

## What it does

The streamer asks a question, gives chat two choices and assigns each a keyword. Viewers pull for a crew by sending an exact command.
Three, six or ten distinct participants in a rolling window unlock short team combos. Repeated participation still contributes,
with cooldowns, diminishing returns and a team lock for the round.

The streamer can start, pause, resume or finish the showdown. A server-owned result freezes the winning choice and its next action:
for example, “Chat chose Mage for the next match” and “Play as Mage in the next match.” The streamer can commit to that choice and rematch.
The same game and consequence appear in a separate transparent read-only stream overlay. The app records a commitment;
the streamer makes the change in their game.

## How it works

Server-side Twitch Authorization Code OAuth and EventSub read chat for the broadcaster's own channel.
Normalized exact commands pass through duplicate, timing, cooldown, repeat and burst checks before affecting force.
A deterministic 20ms simulation tracks position, velocity, momentum, friction and force decay. Coordinated pressure can reverse movement;
comebacks emerge from participation. The server determines time/endpoint wins and ties.

SSE carries bounded state to the dashboard and public source. The overlay interpolates that state and animates an original vector crew
through preparation, pulling, combo, balance, victory and defeat poses. It has no authority to change a result.

## How it was built

TypeScript workspaces separate the Next.js/React interface, persistent Node service and shared contracts. The service owns Twitch credentials,
EventSub lifecycle, game clock and result history. Public viewing uses a different read capability from privileged dashboard controls.
Authorized tokens can persist in an encrypted private vault; rounds and history are intentionally session-scoped.

The visual system uses a light task-focused control room and an illustrated field with coral/mint crews, DM Sans and Barlow Condensed.
Fieldday characters, rope and environment are project-authored vectors. Included font license notices and the complete asset ledger are in the source.

## How Codex was used

Codex helped turn the supplied product requirements into shared contracts, OAuth/EventSub handling, deterministic physics,
fairness rules, the original vector rig, streamer forms and release tests. The development process included reference research,
rendered screenshots, browser recordings, deterministic scenarios and source/security review.

During release QA, Codex reproduced a delayed-response session bug in a real browser and found an SSE disconnection under load.
It implemented the fixes and regression tests. The product brief, phase boundaries and review criteria came from the builder;
the build log records implementation work and limitations. The principal session ID and actual Codex footage must accompany the final entry.

## Technical challenges

Fair participation needs more than counting messages. The engine lets repeat players matter while rewarding distinct users,
and reconnects must preserve a paused game without replaying stale inputs. Animation must follow authority while remaining smooth.
Release testing also exposed that a writable stream's backpressure signal can occur for a valid state frame; closing immediately interrupted the dashboard.
The fix retains one latest state until drain and bounds stalled clients.

## Accomplishments

The local workflow connects configuration, a momentum game, a clear consequence, commitment and another round.
The same source drives the dashboard and overlay, with consistent original art and deliberately limited feedback.
Latest release checks passed147 unit/integration tests and50 production Chromium tests, lint, types, contrast and build.
Actual broadcaster chat produced both directional wins, consequences, acknowledgments, rematches and measured force decay.
Three-person combos were verified separately with deterministic simulation, not a live audience. The historical120-second fixture load used
six overlay clients and one dashboard; it is not a Twitch load result.

## What we learned

Capturing the running product changed decisions that code review alone missed: scaled HUD text, winner naming, connected poses and recovery feedback.
Testing source health separately from game state also made failure behavior clearer. A green build or a fixture message is insufficient evidence for a live integration.

## Future improvements

Complete coordinated real-viewer sessions and native OBS testing first. Then measure balance across different audience sizes,
test longer broadcasts and additional browser engines, improve hosting admission/recovery and evaluate whether durable history is useful.
Any automatic control of another game would require a real integration and a separate permission model.

## Current verification limits — retain until resolved

Basic real Twitch consent/chat/gameplay was verified with one broadcaster. Native OBS/CEF, multi-account combos/comeback,
live cooldown/diminishing, real credential lifecycle and an hours-long broadcast remain unverified.
The repository contains a labeled rehearsal for credential-free evaluation. No user adoption, engagement uplift or finalist placement is claimed.
No top-level project license has been chosen; original work is not represented as CC0/MIT. See [asset credits](ASSET_CREDITS.md).

## Submission fields and status

| Field | Actual value / status |
| --- | --- |
| Repository URL | PASS — https://github.com/shin0343/twitch-codex-plugin-hackaton; public source and README verified without authentication |
| Principal Codex session ID | PASS privately — maintainer must enter the verified original ID from the ignored submission handoff; no ID is published here and `/status` UI was not recorded |
| Public YouTube demo | BLOCKED — no final authentic Twitch/Codex video recorded, uploaded or verified |
| Working-project testing access | PASS source access — anonymous clone includes code/assets/notices and credential-free rehearsal instructions; no hosted application is claimed |
| Devpost state | BLOCKED — no entry opened/published/submitted in this work |

Final requirements/access checks live in [FINAL_SUBMISSION_AUDIT](FINAL_SUBMISSION_AUDIT.md).

Built with: TypeScript, Next.js, React, Node.js, Twitch API/EventSub, Server-Sent Events, SVG, and OpenAI Codex as a development tool.
The running game does not require an OpenAI API key or make LLM calls.
