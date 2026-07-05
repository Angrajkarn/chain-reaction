// ============================================================
// REST API Service
// ============================================================

import { SERVER_URL } from '../constants/config';

export async function fetchRoomInfo(code: string): Promise<{
  code: string;
  playerCount: number;
  gameStarted: boolean;
  gameOver: boolean;
} | null> {
  try {
    const response = await fetch(`${SERVER_URL}/room/${code}`);
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

export async function fetchGreetingMessage(): Promise<string | null> {
  try {
    const response = await fetch(`${SERVER_URL}/greeting`);
    if (!response.ok) return null;
    const data = await response.json();
    return data.message || null;
  } catch {
    return null;
  }
}
