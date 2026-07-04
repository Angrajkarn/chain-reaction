// ============================================================
// General Helpers
// ============================================================

/**
 * Clamps a number between min and max.
 */
export function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

/**
 * Delays execution for given ms.
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Generates a random ID string.
 */
export function randomId(): string {
  return Math.random().toString(36).slice(2);
}

/**
 * Formats a player name (trim + capitalize).
 */
export function formatPlayerName(name: string): string {
  return name.trim().slice(0, 20).replace(/\b\w/g, c => c.toUpperCase());
}
