import type { ErrorRequestHandler } from "express";

import { AppError } from "../utils/AppError.js";

/*
 * Central error handler.
 *
 * Controllers/services can throw errors and let this middleware
 * convert them into a consistent API response.
 */
export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      success: false,
      message: error.message,
    });
  }

  console.error("Unhandled server error:", error);

  return res.status(500).json({
    success: false,
    message: "Internal server error",
  });
};
