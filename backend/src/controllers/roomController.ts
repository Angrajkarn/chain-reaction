// ============================================================
// Room REST API Controller
// ============================================================

import { Request, Response } from 'express';
import { getRoomInfo } from '../services/roomService';

/**
 * GET /room/:code
 * Returns room metadata.
 */
export function getRoomHandler(req: Request, res: Response): void {
  const { code } = req.params;

  if (!code || code.length !== 6) {
    res.status(400).json({ error: 'Invalid room code.' });
    return;
  }

  const info = getRoomInfo(code);

  if (!info) {
    res.status(404).json({ error: 'Room not found.' });
    return;
  }

  res.json(info);
}
