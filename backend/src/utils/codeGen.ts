// ============================================================
// Room Code Generator — 6-digit numericroom code
// ============================================================

const CHARS = '0123456789';

/**
 * Generates a unique 6-character numeric room code.
 * @param existingCodes - Set of already-used codes to avoid duplicates
 */
export function generateRoomCode(existingCodes: Set<string>): string {
  let code: string;
  let attempts = 0;

  do {
    code = Array.from({ length: 6 }, () =>
      CHARS[Math.floor(Math.random() * CHARS.length)]
    ).join('');
    attempts++;

    if (attempts > 1000) {
      // Prevent infinite loop
      throw new Error('Failed to generate unique room code');
    }
  } while (existingCodes.has(code));

  return code;
}
