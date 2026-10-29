import { validateShowdownFields, type ShowdownFields } from './showdown.js';
export const PROTOCOL_VERSION = 2 as const;
export const ROUND_DURATIONS = [30, 45, 60, 90] as const;
export type RoundDuration = (typeof ROUND_DURATIONS)[number];
export type TeamId = "coral" | "mint";
export interface RoundConfig extends Partial<ShowdownFields> {
  title: string;
  coralName: string;
  mintName: string;
  durationSeconds: RoundDuration;
  cooldownSeconds: number;
}
export const DEFAULT_CONFIG: Readonly<RoundConfig> = Object.freeze({
  title: "The great chat showdown",
  coralName: "Coral crew",
  mintName: "Mint crew",
  durationSeconds: 45,
  cooldownSeconds: 2,
});
export const CHAT_COMMANDS = Object.freeze({ coral: "!coral", mint: "!mint" });
export type ConfigErrors = Partial<Record<keyof RoundConfig, string>>;
export function validateRoundConfig(value: unknown): ConfigErrors {
  if (!value || typeof value !== "object")
    return { title: "Enter a round title." };
  const v = value as Record<string, unknown>;
  const errors: ConfigErrors = {};
  for (const [key, label, max] of [
    ["title", "round title", 60],
    ["coralName", "Coral team name", 20],
    ["mintName", "Mint team name", 20],
  ] as const) {
    if (typeof v[key] !== "string" || !v[key].trim())
      errors[key] = `Enter a ${label}.`;
    else if (v[key].trim().length > max)
      errors[key] = `Use ${max} characters or fewer.`;
    else if (/[\u0000-\u001f\u007f]/.test(v[key]))
      errors[key] = 'Use a single line of text.';
  }
  if (
    typeof v.coralName === "string" &&
    typeof v.mintName === "string" &&
    v.coralName.normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase() === v.mintName.normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase()
  )
    errors.mintName = "Give each team a different name.";
  if (!ROUND_DURATIONS.includes(v.durationSeconds as RoundDuration))
    errors.durationSeconds = "Choose 30, 45, 60, or 90 seconds.";
  if (
    typeof v.cooldownSeconds !== "number" ||
    !Number.isInteger(v.cooldownSeconds) ||
    v.cooldownSeconds < 1 ||
    v.cooldownSeconds > 5
  )
    errors.cooldownSeconds = "Choose a cooldown from 1 to 5 seconds.";
  return { ...errors, ...validateShowdownFields(v) };
}
export function isRoundConfig(value: unknown): value is RoundConfig {
  return Object.keys(validateRoundConfig(value)).length === 0;
}
export function validateShowdownConfig(value: unknown): ConfigErrors {
  const errors = validateRoundConfig(value);
  if (errors.title === 'Enter a round title.') errors.title = 'Enter a showdown question.';
  if (errors.coralName === 'Enter a Coral team name.') errors.coralName = 'Enter a Coral choice.';
  if (errors.mintName === 'Enter a Mint team name.') errors.mintName = 'Enter a Mint choice.';
  if (errors.mintName === 'Give each team a different name.') errors.mintName = 'Give each choice a different name.';
  return errors;
}
export function normalizeConfig(config: RoundConfig): RoundConfig {
  return {
    durationSeconds: config.durationSeconds,
    cooldownSeconds: config.cooldownSeconds,
    title: config.title.trim(),
    coralName: config.coralName.trim(),
    mintName: config.mintName.trim(),
    ...(config.template !== undefined ? { template: config.template, consequenceType: config.consequenceType, coralAction: config.coralAction?.trim(), mintAction: config.mintAction?.trim(), startCondition: config.startCondition } : {}),
  };
}
export * from "./connection.js";
export * from "./game.js";
export * from "./showdown.js";
