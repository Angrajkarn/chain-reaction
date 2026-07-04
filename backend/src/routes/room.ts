// ============================================================
// REST API Routes
// ============================================================

import { Router } from 'express';
import { getRoomHandler } from '../controllers/roomController';

const router = Router();

// GET /room/:code — get room info
router.get('/:code', getRoomHandler);

export default router;
