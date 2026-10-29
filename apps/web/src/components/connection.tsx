"use client";
import { useState, type FormEvent } from "react";
import { validateKeywords, type TeamKeywords } from "@chat-tug/contracts";
import { ConnectionError, useConnection } from "@/lib/connection-store";
import { issueCopy, stateCopy } from "@/lib/connection-copy";
import { Button, ButtonLink, Icon, Panel, StatusBadge } from "./ui";

function safeError(error: unknown) {
  return error instanceof ConnectionError && error.code in issueCopy ? issueCopy[error.code as keyof typeof issueCopy] : issueCopy.client_unavailable;
}
export function ConnectionBadge() {
  const { snapshot, feed } = useConnection();
  if (feed !== "live" || !snapshot) return <StatusBadge tone={feed === "loading" ? "neutral" : "warning"}>{feed === "loading" ? "Checking connection" : "Updates unavailable"}</StatusBadge>;
  if (snapshot.evidence.origin === "test_fixture") return <StatusBadge tone="warning">Test provider · {stateCopy[snapshot.state].label}</StatusBadge>;
  return <StatusBadge tone={stateCopy[snapshot.state].tone}>{stateCopy[snapshot.state].label}</StatusBadge>;
}
export function ChatActivity() {
  const { snapshot, feed } = useConnection();
  const inputs = snapshot?.inputs.slice(0, 8) ?? [];
  return <Panel title="Team input activity" action={<ConnectionBadge />}>
    {inputs.length ? <>
      <ul className="input-feed" aria-label="Recognized team inputs">
        {inputs.map(input => <li key={input.id}>
          <span className={`input-team input-team-${input.team}`}>{input.team === "coral" ? "A" : "B"}</span>
          <div><strong>{input.displayName}</strong><span><code>{input.command}</code> · {input.source === "simulation" ? "Simulation" : snapshot?.evidence.origin === "test_fixture" ? "Test fixture" : "Twitch chat"}</span></div>
          <time dateTime={input.occurredAt}>{new Date(input.occurredAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })}</time>
        </li>)}
      </ul>
      <p className="input-footnote">Recognized commands. The active round applies cooldown and fairness rules separately.{feed !== "live" ? " Updates are currently unavailable." : ""}</p>
    </> : <div className="activity-empty"><span className="empty-chat"><Icon name="chat" /></span><div><h3>{feed === "loading" ? "Checking input activity" : feed !== "live" ? "Input updates unavailable" : "No team inputs yet"}</h3><p>{feed !== "live" ? "Activity will appear when the control room receives current updates." : snapshot?.state === "connected" ? `Send ${snapshot.commands.coral} or ${snapshot.commands.mint} in your channel’s chat.` : "Connect your channel or run the labeled local simulation to check the input pipeline."}</p></div></div>}
  </Panel>;
}
function CommandForm({ commands }: { commands: TeamKeywords }) {
  const { action, busy, snapshot, feed } = useConnection();
  const [edited, setValue] = useState<TeamKeywords | null>(null);
  const value = edited ?? commands;
  const [errors, setErrors] = useState<Partial<Record<keyof TeamKeywords, string>>>({});
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const next = validateKeywords(value); setErrors(next); setMessage("");
    if (Object.keys(next).length) return;
    try { await action("commands", value); setValue(null); setFailed(false); setMessage("Team commands saved for this session."); }
    catch (error) { setFailed(true); setMessage(safeError(error)); if (error instanceof ConnectionError && error.fields) setErrors(error.fields); }
  }
  return <form className="command-form" onSubmit={save} noValidate>
    <h2>Two teams. Two commands.</h2>
    <p>Only an exact command counts. Letter case and surrounding spaces are ignored.</p>
    <div className="command-fields">{(["coral", "mint"] as const).map((team, index) => <div className="field" key={team}>
      <label htmlFor={`command-${team}`}><span className={`team-swatch ${team}`} />Team {index === 0 ? "A · Coral" : "B · Mint"}</label>
      <input id={`command-${team}`} autoComplete="off" spellCheck={false} maxLength={21} value={value[team]} onChange={event => { setValue({ ...value, [team]: event.target.value }); setMessage(""); }} aria-invalid={Boolean(errors[team])} aria-describedby={`command-${team}-help`} />
      <p id={`command-${team}-help`} className={errors[team] ? "field-error" : "field-help"}>{errors[team] ?? "! + 1–20 characters; start with a letter"}</p>
    </div>)}</div>
    <div className="command-save"><Button type="submit" variant="secondary" disabled={busy || feed !== "live" || snapshot?.simulation?.running}>Save commands</Button>{snapshot?.simulation?.running && <span>Stop the simulation to edit commands.</span>}</div>
    {message && <p className={`inline-message ${failed ? "error" : "success"}`} role={failed ? "alert" : "status"}>{message}</p>}
  </form>;
}
export function Connection({ onboarding = false }: { onboarding?: boolean }) {
  const { snapshot, csrf, feed, busy, action, retry } = useConnection();
  const [error, setError] = useState("");
  const available = feed === "live" && Boolean(snapshot);
  const status = available && snapshot ? stateCopy[snapshot.state] : null;
  const authorize = available && snapshot?.credentialsConfigured && !busy;
  async function run(path: Parameters<typeof action>[0]) { setError(""); try { await action(path); } catch (failure) { setError(safeError(failure)); } }
  const active = snapshot?.state === "connected" || snapshot?.state === "connecting" || snapshot?.state === "reconnecting";
  return <>
    {feed !== "live" && <div className="connection-system-notice" role="status"><div><strong>{feed === "loading" ? "Checking the connection server…" : "Control room updates are unavailable."}</strong><p>{feed === "loading" ? "Reading your session before showing connection status." : "The displayed activity may be out of date. Check that both app processes are running, then retry."}</p></div>{feed !== "loading" && <Button variant="secondary" onClick={retry}>Retry updates</Button>}</div>}
    {snapshot?.evidence.origin === "test_fixture" && <p className="inline-message warning" role="status">Test provider — this screen uses automated fixtures. It is not evidence of real Twitch connectivity.</p>}
    <div className="connection-workspace">
      <div className="connection-main">
        <section className={`connection-panel connection-state-${available ? snapshot?.state : "unavailable"}`} aria-labelledby="connection-title">
          <div className="connection-panel-header"><span className="connection-symbol"><Icon name="connect" /></span><span role="status"><ConnectionBadge /></span></div>
          <h2 id="connection-title">{status?.title ?? (feed === "loading" ? "Checking your channel." : "Connection updates interrupted.")}</h2>
          <p>{status?.description ?? (feed === 'loading' ? 'Waiting for the server to confirm your session. Controls become available when current updates arrive.' : 'Your current connection status will appear after the server responds. Use Retry updates above to reconnect.')}</p>
          {snapshot?.channel && <div className="channel-identity"><span className="channel-avatar" aria-hidden="true">{snapshot.channel.displayName.slice(0, 1)}</span><div><strong>{snapshot.channel.displayName}</strong><span>twitch.tv/{snapshot.channel.login}</span></div><span>{snapshot.authorized ? "Authorized account" : "Previous channel"}</span></div>}
          {snapshot?.issue && <p className={`connection-reason ${status?.tone === "error" ? "reason-error" : ""}`} role={status?.tone === "error" ? "alert" : "status"}>{issueCopy[snapshot.issue]}</p>}
          {snapshot?.notice && <p className="inline-message warning" role="alert">{issueCopy[snapshot.notice]}</p>}
          {error && <p className="inline-message error" role="alert">{error}</p>}
          <div className="connection-permissions"><h3>One permission, for your channel</h3><ul><li><Icon name="check" /><span>Read chat messages in the channel you own.</span></li><li><Icon name="check" /><span>Viewers play in Twitch chat. They don’t need to sign in here.</span></li></ul><p className="permission-scope"><code>user:read:chat</code> · No permission to post messages.</p></div>
          <div className="connection-actions">
            {active ? <>
              {snapshot?.state === "connected" && available ? <p className="connected-check"><Icon name="check" />Chat subscription confirmed{snapshot.evidence.origin === "test_fixture" ? " by test provider" : " by Twitch"}.</p> : <p className="connecting-message">{!available ? "Waiting for current connection updates…" : snapshot?.state === "reconnecting" ? snapshot.reconnectAttempt ? `Automatic retry ${snapshot.reconnectAttempt} of 5` : "Moving to Twitch’s replacement connection…" : "Waiting for Twitch’s subscription confirmation…"}</p>}
              <Button variant="secondary" disabled={busy || !available} onClick={() => void run("twitch/disconnect")}>Disconnect Twitch</Button>
            </> : <>
              {snapshot?.authorized && <Button disabled={!available || busy || !snapshot.credentialsConfigured} onClick={() => void run("twitch/reconnect")}><Icon name="reset" />Resume Twitch connection</Button>}
              <form method="post" action="/api/auth/twitch/start"><input type="hidden" name="csrf" value={csrf} /><Button type="submit" disabled={!authorize} className="w-full" variant={snapshot?.authorized ? "secondary" : "primary"}><Icon name="connect" />{snapshot?.state === "authorization_expired" || snapshot?.authorized ? "Authorize with Twitch again" : "Authorize with Twitch"}<Icon name="external" /></Button></form>
              {snapshot?.authorized && <Button variant="quiet" disabled={!available || busy} onClick={() => void run("twitch/disconnect")}>Disconnect this account</Button>}
            </>}
          </div>
          {snapshot && !snapshot.credentialsConfigured && snapshot.issue !== "credentials_missing" && <p className="connection-privacy">Twitch authorization needs app credentials on the server. Setup: docs/TWITCH_SETUP.md.</p>}
          <p className="connection-privacy">Authorization happens on Twitch. Private tokens stay on the server. {!snapshot ? "Session storage status has not been confirmed." : snapshot.persistence === "memory" ? "Local mode: authorization resets when the server restarts." : "Session credentials are encrypted at rest."}</p>
        </section>
        {snapshot && <CommandForm commands={snapshot.commands} />}
      </div>
      <aside className="connection-support">
        <section className="simulation-panel" aria-labelledby="simulation-title"><span className="eyebrow">Local simulation</span><h2 id="simulation-title">Test chat commands.</h2><p>Four simulated viewers test a burst, a quiet spell and a reconnect. No Twitch account required.</p>
          {snapshot?.mode === "simulation" && <div className="simulation-progress" role="status"><StatusBadge tone="demo">Simulation only</StatusBadge><strong>{({ starting: "Starting the sequence", burst: "A burst from both crews", quiet: "Quiet period · waiting", disconnected: "Simulated connection lost", reconnected: "Simulated connection restored", complete: "Sequence complete" } as const)[snapshot.simulation?.step ?? "complete"]}</strong></div>}
          <Button variant="secondary" className="w-full" disabled={!available || busy} onClick={() => void run(snapshot?.simulation?.running ? "simulation/stop" : "simulation/start")}>{snapshot?.simulation?.running ? "Stop simulation" : snapshot?.mode === "simulation" ? "Replay simulation" : "Run local simulation"}</Button>
          {snapshot?.mode === "simulation" && !snapshot.simulation?.running && <Button variant="quiet" className="w-full" disabled={!available || busy} onClick={() => void run("simulation/stop")}>Exit simulation</Button>}
          {active && <p className="simulation-warning">Starting simulation pauses Twitch ingestion. Resume Twitch when you’re done.</p>}
        </section>
        <section className="connection-checklist"><h2>Verify your first input</h2><ol className="connection-flow"><li><span>1</span><div><strong>Authorize your channel</strong><p>Use the broadcaster account. Approve chat read access on Twitch.</p></div></li><li><span>2</span><div><strong>Wait for Connected</strong><p>The server must confirm your chat subscription first.</p></div></li><li><span>3</span><div><strong>Send a team command</strong><p>Type <code>{snapshot?.commands.coral ?? "!coral"}</code> or <code>{snapshot?.commands.mint ?? "!mint"}</code> in your channel. Look for it below.</p></div></li></ol></section>
        {available && snapshot?.state === "connected" && snapshot.evidence.origin === "twitch" && snapshot.evidence.eventId && <a href="/api/evidence" className="btn btn-secondary" download>Download safe connection evidence<Icon name="external" /></a>}
        <ButtonLink href={onboarding ? "/dashboard/round" : "/dashboard"} variant="quiet">{onboarding ? "Continue to round setup" : "Back to control room"}<Icon name="arrow" /></ButtonLink>
      </aside>
    </div>
    <div className="connection-activity"><ChatActivity />{snapshot && <p className="pipeline-diagnostics">This run: {snapshot.counters.recognized} recognized · {snapshot.counters.ignored} ignored · {snapshot.counters.duplicates} duplicates rejected · {snapshot.counters.invalid} invalid · Input source: {snapshot.mode === "simulation" ? "local simulation" : snapshot.mode === "twitch" ? snapshot.evidence.origin === "test_fixture" ? "test fixture" : "Twitch" : "none"}</p>}</div>
  </>;
}
