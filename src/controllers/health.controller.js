import { asyncHandler } from '../utils/asyncHandler.js';

export const getHealth = asyncHandler(async (_req, res) => {
  res.status(200).json({ data: { status: 'ok' } });
});
