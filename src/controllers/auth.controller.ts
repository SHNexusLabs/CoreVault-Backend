import type { Request, Response } from "express";
import { z } from "zod";

import {
  getCurrentUser,
  loginUser,
  registerUser,
} from "../services/auth.service.js";

import type { AuthenticatedRequest } from "../middleware/auth.middleware.js";

const registerSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters"),
  email: z.string().trim().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  phone: z.string().trim().optional(),
});

export async function register(req: Request, res: Response) {
  const result = registerSchema.safeParse(req.body);

  if (!result.success) {
    return res.status(400).json({
      success: false,
      message: "Invalid registration data",
      errors: result.error.flatten().fieldErrors,
    });
  }

  try {
    const user = await registerUser(
      result.data.name,
      result.data.email,
      result.data.password,
      result.data.phone,
    );

    return res.status(201).json({
      success: true,
      message: "Account created successfully",
      user,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "EMAIL_ALREADY_EXISTS") {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists",
      });
    }

    console.error("Registration error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to create account",
    });
  }
}

export async function login(req: Request, res: Response) {
  const result = z
    .object({
      email: z.string().trim().email("Invalid email address"),
      password: z.string().min(1, "Password is required"),
    })
    .safeParse(req.body);

  if (!result.success) {
    return res.status(400).json({
      success: false,
      message: "Invalid login data",
      errors: result.error.flatten().fieldErrors,
    });
  }

  try {
    const resultData = await loginUser(result.data.email, result.data.password);

    return res.status(200).json({
      success: true,
      message: "Login successful",
      token: resultData.token,
      user: resultData.user,
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "INVALID_CREDENTIALS") {
        return res.status(401).json({
          success: false,
          message: "Invalid email or password",
        });
      }

      if (error.message === "ACCOUNT_DISABLED") {
        return res.status(403).json({
          success: false,
          message: "Your account has been disabled",
        });
      }
    }

    console.error("Login error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to login",
    });
  }
}

export async function me(req: Request, res: Response) {
  const authenticatedReq = req as AuthenticatedRequest;

  try {
    const user = await getCurrentUser(authenticatedReq.user.id);

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: "Account is unavailable",
      });
    }

    return res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    console.error("Get current user error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve account",
    });
  }
}
