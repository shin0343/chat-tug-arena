import type { ServerResponse } from 'node:http';

export const SSE_DRAIN_TIMEOUT_MS = 5000;
type Subscribe = (send: (frame: string) => void, reset: () => void) => () => void;

/** Keep only the latest snapshot while the socket drains; never build a replay queue. */
export function openEventStream(response: ServerResponse, subscribe: Subscribe, resetFrame?: string) {
  let ended = false, ready = false, blocked = false;
  let pending: string | undefined;
  let unsubscribe = () => {};
  let heartbeat: ReturnType<typeof setInterval> | undefined = undefined;
  let timeout: ReturnType<typeof setTimeout> | undefined;
  function finish() {
    if (ended) return;
    ended = true; pending = undefined; clearInterval(heartbeat); clearTimeout(timeout);
    response.off('drain', drain); unsubscribe(); response.end();
  }
  function send(frame: string) {
    if (ended) return;
    if (!ready || blocked) { pending = frame; return; }
    // false means backpressure, including a single valid frame above the high-water mark.
    if (!response.write(frame)) {
      blocked = true;
      timeout = setTimeout(() => { finish(); response.destroy(); }, SSE_DRAIN_TIMEOUT_MS); timeout.unref?.();
    }
  }
  function drain() {
    clearTimeout(timeout); timeout = undefined; blocked = false;
    const next = pending; pending = undefined; if (next) send(next);
  }
  unsubscribe = subscribe(send, () => { if (ready && !ended && resetFrame) response.write(resetFrame); finish(); });
  response.on('drain', drain); response.on('close', finish); response.on('error', finish);
  response.writeHead(200, { 'Content-Type': 'text/event-stream', Connection: 'keep-alive', 'X-Accel-Buffering': 'no', 'Cache-Control': 'no-store, no-transform' });
  response.flushHeaders(); ready = true;
  const initial = pending; pending = undefined; send('retry: 2000\n\n'); if (initial) send(initial);
  heartbeat = setInterval(() => { if (!blocked) send('event: heartbeat\ndata: {}\n\n'); }, 15_000); heartbeat.unref?.();
}
