"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { isConnectionSnapshot, isRecord, type ConnectionSnapshot, type SessionView } from "@chat-tug/contracts";

type Feed = "loading" | "live" | "reconnecting" | "unavailable";
export type GameAction = "prepare" | "start" | "pause" | "resume" | "abandon" | "reset" | "rematch" | "simulate" | "test-input" | "finish" | "configure" | "commit" | "rehearse" | "rehearsal-check";
type Action = "twitch/reconnect" | "twitch/disconnect" | "simulation/start" | "simulation/stop" | "commands" | `game/${GameAction}`;
export class ConnectionError extends Error {
  constructor(readonly code: string, readonly fields?: Record<string, string>) { super(code); }
}
interface ConnectionContextValue {
  snapshot: ConnectionSnapshot | null; csrf: string; feed: Feed; busy: boolean;
  action(path: Action, payload?: unknown): Promise<SessionView>; retry(): void;
}
const Context = createContext<ConnectionContextValue | null>(null);
function sessionView(value: unknown): value is SessionView {
  return isRecord(value) && typeof value.csrfToken === "string" && /^[\w-]{43}$/.test(value.csrfToken) && isConnectionSnapshot(value.snapshot);
}
export function ConnectionProvider({ children }: { children: ReactNode }) {
  const [snapshot, setSnapshot] = useState<ConnectionSnapshot | null>(null);
  const [csrf, setCsrf] = useState("");
  const [feed, setFeed] = useState<Feed>("loading");
  const [busy, setBusy] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const mounted = useRef(false);
  const currentCsrf = useRef("");
  const retry = useCallback(() => setAttempt(v => v + 1), []);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);
  useEffect(() => {
    const abort = new AbortController();
    let events: EventSource | undefined;
    let acknowledged: string | null = null;
    let lastSignal = Date.now();
    const timer = setInterval(() => {
      if (Date.now() - lastSignal > 40_000) setFeed("unavailable");
    }, 10_000);
    async function connect() {
      try {
        let response = await fetch("/api/session", { cache: "no-store", signal: abort.signal });
        let data: unknown = await response.json();
        // Wait for an in-flight rotation's Set-Cookie instead of creating a
        // competing anonymous session. Old cookies never gain renewed authority.
        for (let retries = 0; response.status === 409 && isRecord(data) && data.error === "session_rotating" && retries < 8; retries++) {
          await new Promise(resolve => setTimeout(resolve, 250));
          if (abort.signal.aborted) return;
          response = await fetch("/api/session", { cache: "no-store", signal: abort.signal });
          data = await response.json();
        }
        if (!response.ok || !sessionView(data)) throw new Error("session_unavailable");
        if (abort.signal.aborted) return;
        currentCsrf.current = data.csrfToken;
        setSnapshot(data.snapshot); setCsrf(data.csrfToken);
        events = new EventSource("/api/events");
        events.addEventListener("connection.snapshot", event => {
          if (abort.signal.aborted) return;
          try {
            const message: unknown = JSON.parse(event.data);
            if (!isRecord(message) || message.type !== "connection.snapshot" || !isConnectionSnapshot(message.snapshot)) throw new Error("invalid_update");
            const next = message.snapshot;
            setSnapshot(previous => previous && previous.revision > next.revision ? previous : next); setFeed("live"); lastSignal = Date.now();
            const eventId = next.evidence.eventId;
            if (next.state === "connected" && next.evidence.origin === "twitch" && eventId && acknowledged !== eventId && next.inputs.some(input => input.id === eventId && input.source === "twitch")) {
              acknowledged = eventId;
              void fetch("/api/evidence/ack", { method: "POST", headers: { "Content-Type": "application/json", "X-CSRF-Token": data.csrfToken }, body: JSON.stringify({ eventId }), signal: abort.signal }).then(response => { if (!response.ok) acknowledged = null; }).catch(() => { acknowledged = null; });
            }
          } catch { setFeed("unavailable"); }
        });
        events.addEventListener("heartbeat", () => { if (!abort.signal.aborted) { lastSignal = Date.now(); setFeed("live"); } });
        events.addEventListener("session.reset", () => { events?.close(); setFeed("reconnecting"); retry(); });
        events.onerror = () => { if (!abort.signal.aborted) setFeed("reconnecting"); };
      } catch { if (!abort.signal.aborted) setFeed("unavailable"); }
    }
    const offline = () => { events?.close(); abort.abort(); setFeed('unavailable'); };
    const online = () => retry();
    window.addEventListener('offline', offline); window.addEventListener('online', online);
    if (navigator.onLine) void connect(); else offline();
    return () => { abort.abort(); events?.close(); clearInterval(timer); window.removeEventListener('offline', offline); window.removeEventListener('online', online); };
  }, [attempt, retry]);
  const action = useCallback(async (path: Action, payload: unknown = {}) => {
    setBusy(true);
    try {
      const response = await fetch(`/api/${path}`, { method: "POST", headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf }, body: JSON.stringify(payload), signal: AbortSignal.timeout(12_000) });
      const data: unknown = await response.json();
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) retry();
        throw new ConnectionError(isRecord(data) && typeof data.error === "string" ? data.error : "provider_unavailable", isRecord(data) && isRecord(data.fields) ? data.fields as Record<string, string> : undefined);
      }
      if (!sessionView(data)) throw new ConnectionError("provider_unavailable");
      // A bootstrap may have rotated the session while this request was in flight.
      // Its late response must not replace the newer session's control token/state.
      if (mounted.current && currentCsrf.current === csrf) {
        currentCsrf.current = data.csrfToken;
        setSnapshot(previous => previous && previous.revision > data.snapshot.revision ? previous : data.snapshot); setCsrf(data.csrfToken);
      }
      return data;
    } catch (error) { throw error instanceof ConnectionError ? error : new ConnectionError("client_unavailable"); }
    finally { if (mounted.current) setBusy(false); }
  }, [csrf, retry]);
  return <Context.Provider value={{ snapshot, csrf, feed, busy, action, retry }}>{children}</Context.Provider>;
}
export function useConnection() {
  const value = useContext(Context);
  if (!value) throw new Error("ConnectionProvider is required");
  return value;
}
