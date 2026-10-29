"use client";
import { useSyncExternalStore } from "react";
import {
  DEFAULT_CONFIG,
  isRoundConfig,
  normalizeConfig,
  type RoundConfig,
} from "@chat-tug/contracts";
export const CONFIG_STORAGE_KEY = "chat-tug:round-config:v1";
const CHANGE_EVENT = "chat-tug:config-changed";
const serverSnapshot = {
  config: DEFAULT_CONFIG as RoundConfig,
  readError: false,
};
let cachedRaw: string | null | undefined;
let cachedSnapshot = serverSnapshot;
function getSnapshot() {
  try {
    const raw = localStorage.getItem(CONFIG_STORAGE_KEY);
    if (raw !== cachedRaw) {
      cachedRaw = raw;
      if (raw === null) cachedSnapshot = serverSnapshot;
      else {
        try {
          const parsed: unknown = JSON.parse(raw);
          cachedSnapshot = isRoundConfig(parsed)
            ? { config: normalizeConfig(parsed), readError: false }
            : { ...serverSnapshot, readError: true };
        } catch {
          cachedSnapshot = { ...serverSnapshot, readError: true };
        }
      }
    }
  } catch {
    if (!cachedSnapshot.readError)
      cachedSnapshot = { ...serverSnapshot, readError: true };
  }
  return cachedSnapshot;
}
function subscribe(listener: () => void) {
  window.addEventListener("storage", listener);
  window.addEventListener(CHANGE_EVENT, listener);
  return () => {
    window.removeEventListener("storage", listener);
    window.removeEventListener(CHANGE_EVENT, listener);
  };
}
export function saveRoundConfig(config: RoundConfig) {
  if (!isRoundConfig(config)) throw new Error("Invalid configuration");
  localStorage.setItem(
    CONFIG_STORAGE_KEY,
    JSON.stringify(normalizeConfig(config)),
  );
  window.dispatchEvent(new Event(CHANGE_EVENT));
}
export function useRoundConfig() {
  return useSyncExternalStore(subscribe, getSnapshot, () => serverSnapshot);
}
