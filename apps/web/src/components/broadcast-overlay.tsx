"use client";
import { useEffect, useState } from 'react';
import { isOverlaySnapshot, type OverlaySnapshot } from '@chat-tug/contracts';
import { BroadcastStage } from './scene/broadcast-stage';

/** Read-only fetch stream. The capability stays in the fragment and Authorization header. */
export function BroadcastOverlay({ preview }: { preview: boolean }) {
  const [snapshot, setSnapshot] = useState<OverlaySnapshot | null>(null);
  const [status, setStatus] = useState<'standby' | 'loading' | 'current' | 'unavailable'>('standby');
  useEffect(() => {
    const key = new URLSearchParams(window.location.hash.slice(1)).get('room');
    if (!key || !/^[\w-]{43}$/.test(key)) return;
    let stopped = false; let connecting = false; let retry: ReturnType<typeof setTimeout> | undefined;
    let active: AbortController | undefined;
    const connect = async () => {
      if (stopped || connecting || !navigator.onLine) return;
      connecting = true;
      const abort = new AbortController(); active = abort; let lastSignal = Date.now();
      const watchdog = setInterval(() => { if (Date.now() - lastSignal > 40_000) abort.abort(); }, 5000);
      setStatus('loading');
      try {
        const response = await fetch('/api/overlay/events', { headers: { Authorization: `Bearer ${key}` }, credentials: 'omit', cache: 'no-store', signal: abort.signal });
        if (!response.ok || !response.body) throw new Error('overlay_unavailable');
        const reader = response.body.getReader(); const decoder = new TextDecoder(); let buffer = '';
        try {
          while (!stopped) {
            const next = await reader.read(); if (next.done) throw new Error('overlay_closed');
            buffer += decoder.decode(next.value, { stream: true }); lastSignal = Date.now();
            if (buffer.length > 262_144) throw new Error('overlay_frame_too_large');
            let boundary = buffer.indexOf('\n\n');
            while (boundary >= 0) {
              const frame = buffer.slice(0, boundary); buffer = buffer.slice(boundary + 2);
              if (frame.includes('event: game.snapshot')) {
                const data = frame.split('\n').filter(line => line.startsWith('data: ')).map(line => line.slice(6)).join('\n');
                const value: unknown = JSON.parse(data);
                if (!isOverlaySnapshot(value)) throw new Error('overlay_invalid');
                if (!stopped) { setSnapshot(previous => previous && previous.revision > value.revision ? previous : value); setStatus('current'); }
              }
              boundary = buffer.indexOf('\n\n');
            }
          }
        } finally { await reader.cancel().catch(() => {}); }
      } catch { if (!stopped) setStatus('unavailable'); }
      finally { clearInterval(watchdog); abort.abort(); if (active === abort) active = undefined; connecting = false; if (!stopped && navigator.onLine) retry = setTimeout(() => void connect(), 2000); }
    };
    const offline = () => { clearTimeout(retry); active?.abort(); setStatus('unavailable'); };
    const online = () => { clearTimeout(retry); void connect(); };
    window.addEventListener('offline', offline); window.addEventListener('online', online);
    if (navigator.onLine) void connect(); else offline();
    return () => { stopped = true; clearTimeout(retry); active?.abort(); window.removeEventListener('offline', offline); window.removeEventListener('online', online); };
  }, []);
  return <BroadcastStage snapshot={snapshot} status={status} preview={preview} />;
}
