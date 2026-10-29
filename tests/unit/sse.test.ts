import { afterEach, expect, it, vi } from 'vitest';
import { EventEmitter } from 'node:events';
import type { ServerResponse } from 'node:http';
import { openEventStream, SSE_DRAIN_TIMEOUT_MS } from '../../apps/realtime/src/sse';

afterEach(() => vi.useRealTimers());
function consumer() {
  const response = Object.assign(new EventEmitter(), { write: vi.fn(() => true), writeHead: vi.fn(), flushHeaders: vi.fn(), end: vi.fn(), destroy: vi.fn() });
  const unsubscribe = vi.fn(); let send!: (frame: string) => void, reset!: () => void;
  openEventStream(response as unknown as ServerResponse, (publish, rotate) => { send = publish; reset = rotate; send('initial\n\n'); return unsubscribe; }, 'event: session.reset\ndata: {}\n\n');
  return { response, unsubscribe, send, reset };
}
it('keeps a healthy client after a large write and coalesces queued snapshots until drain', () => {
  vi.useFakeTimers(); const { response, unsubscribe, send } = consumer();
  response.write.mockReturnValueOnce(false); send('large snapshot\n\n');
  for (let n = 0; n < 1000; n++) send(`snapshot ${n}\n\n`);
  expect(response.end).not.toHaveBeenCalled(); expect(response.write).toHaveBeenCalledTimes(3);
  response.emit('drain'); expect(response.write).toHaveBeenLastCalledWith('snapshot 999\n\n');
  vi.advanceTimersByTime(SSE_DRAIN_TIMEOUT_MS + 1); expect(response.end).not.toHaveBeenCalled();
  response.emit('close'); expect(unsubscribe).toHaveBeenCalledTimes(1);
});
it('closes a stalled consumer on a bounded deadline and releases its subscription once', () => {
  vi.useFakeTimers(); const { response, unsubscribe, send } = consumer();
  response.write.mockReturnValueOnce(false); send('blocked\n\n'); send('latest\n\n');
  vi.advanceTimersByTime(SSE_DRAIN_TIMEOUT_MS); expect(response.end).toHaveBeenCalledTimes(1); expect(unsubscribe).toHaveBeenCalledTimes(1);
  expect(response.destroy).toHaveBeenCalledTimes(1);
  response.emit('close'); send('late\n\n'); response.emit('drain');
  expect(response.write).toHaveBeenCalledTimes(3); expect(unsubscribe).toHaveBeenCalledTimes(1);
});
it('sends session reset before closing even when the preceding frame is draining', () => {
  vi.useFakeTimers(); const { response, unsubscribe, send, reset } = consumer();
  response.write.mockReturnValueOnce(false); send('large\n\n'); reset();
  expect(response.write).toHaveBeenLastCalledWith('event: session.reset\ndata: {}\n\n'); expect(response.end).toHaveBeenCalledTimes(1);
  expect(unsubscribe).toHaveBeenCalledTimes(1); expect(vi.getTimerCount()).toBe(0);
});
