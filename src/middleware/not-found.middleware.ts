import type { Request, Response } from "express";

/*
 * Handles requests that don't match any registered route.
 */
export function notFoundHandler(req: Request, res: Response) {
  return res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
}
