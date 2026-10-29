"use client";
import { useEffect, useState } from 'react';
import { Button, ButtonLink, Icon } from './ui';
import { useConnection } from '@/lib/connection-store';

export function OverlaySetup({ compact = false }: { compact?: boolean }) {
  const { feed, csrf } = useConnection();
  const [source, setSource] = useState<{ url: string; session: string } | null>(null);
  const [feedback, setFeedback] = useState(''), [failed, setFailed] = useState(false), [revealed, setRevealed] = useState(false);
  const [attempt, setAttempt] = useState(0), [sourceError, setSourceError] = useState(false);
  const url = source?.session === csrf ? source.url : '';
  useEffect(() => {
    if (feed !== 'live' || !csrf) return;
    const abort = new AbortController();
    void fetch('/api/game/overlay-key', { cache: 'no-store', signal: abort.signal }).then(async response => {
      const value: unknown = await response.json();
      if (!response.ok || !value || typeof value !== 'object' || !('key' in value) || typeof value.key !== 'string' || !/^[\w-]{43}$/.test(value.key)) throw new Error('source_unavailable');
      if (!abort.signal.aborted) { setSource({ url: `${window.location.origin}/overlay#room=${value.key}`, session: csrf }); setSourceError(false); }
    }).catch(() => { if (!abort.signal.aborted) setSourceError(true); });
    return () => abort.abort();
  }, [feed, csrf, attempt]);
  async function copy(standby = false) {
    try { await navigator.clipboard.writeText(standby ? `${window.location.origin}/overlay` : url); setFailed(false); setFeedback(standby ? 'Preview URL copied. This source shows the disconnected overlay shell.' : 'Arena source URL copied. Paste it into your OBS Browser Source.'); }
    catch { setFailed(true); setFeedback('Clipboard access was blocked. Show the source URL, select it and copy it with your keyboard.'); }
  }
  const preview = url ? `${url.replace('/overlay#', '/overlay?preview=1#')}` : '/overlay?preview=1';
  // A hash-only navigation does not remount the overlay's initial capability reader.
  // Mount once the room URL is ready; a rotated capability gets a fresh document too.
  const previewFrame = url ? <iframe key={url} src={preview} className="source-iframe" title="Read-only arena preview" tabIndex={-1} /> : <div className="source-loading">{sourceError ? 'Arena preview unavailable.' : feed === 'live' ? 'Preparing arena preview…' : 'Waiting for control room updates.'}</div>;
  if (compact) return <div className="compact-overlay"><div className="overlay-preview-checker">{previewFrame}</div>
    <p role={sourceError ? 'status' : undefined}>{url ? 'Your round and result, as viewers see them.' : sourceError ? 'Source unavailable. Open OBS setup to retry.' : feed === 'live' ? 'Preparing your read-only arena source.' : 'Waiting for control room updates.'}</p><ButtonLink href="/dashboard/overlay" variant="secondary">Set up OBS overlay</ButtonLink></div>;
  return <div className="overlay-setup-layout">
    <section className="overlay-source-panel"><div className="overlay-preview-checker">{previewFrame}</div>
      <div className="overlay-source-footer"><div><h2>Your current arena, on your stream.</h2><p>Read-only preview. It follows the choices, game and result in your control room.</p></div>{url && <ButtonLink href={url} variant="secondary" target="_blank" rel="noreferrer">Open transparent source<Icon name="external" /></ButtonLink>}</div>
      <details className="overlay-troubleshooting"><summary>Overlay troubleshooting</summary><ul><li>Blank or waiting? Prepare a showdown in the control room and check its connection status.</li><li>Stopped updating? Restore the server connection, then refresh the Browser Source in OBS.</li><li>After authorizing again, disconnecting or restarting the server, reload this setup and copy a fresh link.</li><li>Use 1920 × 1080 or 1280 × 720. Keep the Browser Source background transparent.</li><li>Simulation stays labeled. Only a real Twitch connection receives your channel’s pulls.</li></ul></details>
    </section>
    <aside className="obs-instructions"><h2>Add your arena to OBS</h2><ol>
      <li><strong>Add a Browser Source.</strong><p>In your OBS scene, add a Browser Source named “Chat Tug Arena”.</p></li>
      <li><strong>Paste your read-only source URL.</strong><p>This link can view your arena. Streamer controls stay in this workspace.</p>
        <label className="sr-only" htmlFor="arena-source-url">Read-only overlay URL</label><input id="arena-source-url" className="overlay-url" type={revealed ? 'text' : 'password'} readOnly value={url} placeholder={sourceError ? 'Source link unavailable' : feed === 'live' ? 'Preparing source link…' : 'Waiting for updates…'} autoComplete="off" spellCheck={false} onFocus={event => event.target.select()} />
        <div className="overlay-url-actions"><Button disabled={!url || feed !== 'live'} onClick={() => void copy()}><Icon name="copy" />Copy arena source URL</Button><Button variant="quiet" disabled={!url} aria-pressed={revealed} onClick={() => setRevealed(value => !value)}>{revealed ? 'Hide source URL' : 'Show source URL'}</Button></div>
        {sourceError && <div className="inline-message error" role="alert">The source link could not be loaded. <Button variant="secondary" onClick={() => setAttempt(value => value + 1)}>Retry source link</Button></div>}
      </li>
      <li><strong>Set the canvas size.</strong><div className="canvas-dimensions"><span>Width<strong>1920 px</strong></span><span>Height<strong>1080 px</strong></span></div><p>1280 × 720 also works. The scene scales as one composition.</p></li>
      <li><strong>Place it above your footage.</strong><p>The arena sits near the bottom. Leave the rest transparent and keep the Browser Source active while playing.</p></li>
    </ol>
      {feedback && <p role={failed ? 'alert' : 'status'} className={`inline-message action-feedback ${failed ? 'error' : 'success'}`}>{feedback}</p>}
      <details className="standby-source"><summary>Need a disconnected layout preview?</summary><p>This preview has no room connection or saved showdown.</p><Button variant="secondary" onClick={() => void copy(true)}>Copy preview URL</Button><ButtonLink href="/overlay?preview=1" variant="quiet" target="_blank" rel="noreferrer">Open preview</ButtonLink></details>
    </aside>
  </div>;
}
