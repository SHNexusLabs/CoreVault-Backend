import type { Request, Response } from "express";
import { z } from "zod";

import {
  getAdminReturn,
  getAdminReturns,
  updateReturnStatus,
} from "../services/admin-return.service.js";
import {
  approveRefund,
  completeRefund,
  failRefund,
  retryRefund,
  startRefundProcessing,
} from "../services/refund.service.js";

import { RefundStatus, ReturnStatus } from "../generated/prisma/client.js";

const updateReturnStatusSchema = z.object({
  status: z.enum(ReturnStatus),
});

const adminReturnQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),

  limit: z.coerce.number().int().min(1).max(100).default(20),

  status: z.enum(ReturnStatus).optional(),

  refundStatus: z.enum(RefundStatus).optional(),
});

export async function getAdminReturnList(req: Request, res: Response) {
  const result = adminReturnQuerySchema.safeParse(req.query);

  if (!result.success) {
    return res.status(400).json({
      success: false,
      message: "Invalid return query",
      errors: result.error.flatten().fieldErrors,
    });
  }

  try {
    const data = await getAdminReturns(result.data);

    return res.status(200).json({
      success: true,
      ...data,
    });
  } catch (error) {
    console.error("Get admin returns error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve return requests",
    });
  }
}

export async function getAdminReturnDetails(req: Request, res: Response) {
  const id = req.params.id;

  if (typeof id !== "string" || !id) {
    return res.status(400).json({
      success: false,
      message: "Return ID is required",
    });
  }

  try {
    const returnRequest = await getAdminReturn(id);

    return res.status(200).json({
      success: true,
      returnRequest,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "RETURN_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "Return request not found",
      });
    }

    console.error("Get admin return details error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve return request",
    });
  }
}

export async function updateAdminReturnStatus(req: Request, res: Response) {
  const id = req.params.id;

  if (typeof id !== "string" || !id) {
    return res.status(400).json({
      success: false,
      message: "Return ID is required",
    });
  }

  const result = updateReturnStatusSchema.safeParse(req.body);

  if (!result.success) {
    return res.status(400).json({
      success: false,
      message: "Invalid return status",
      errors: result.error.flatten().fieldErrors,
    });
  }

  try {
    const returnRequest = await updateReturnStatus(id, result.data.status);

    return res.status(200).json({
      success: true,
      message: "Return status updated successfully",
      returnRequest,
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "RETURN_NOT_FOUND") {
        return res.status(404).json({
          success: false,
          message: "Return request not found",
        });
      }

      if (error.message === "INVALID_RETURN_STATUS_TRANSITION") {
        return res.status(409).json({
          success: false,
          message: "This return status transition is not allowed",
        });
      }
    }

    console.error("Update admin return status error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to update return status",
    });
  }
}

export async function approveAdminRefund(req: Request, res: Response) {
  const id = req.params.id;
  const adminUserId = req.user?.id;

  if (typeof id !== "string" || !id) {
    return res.status(400).json({
      success: false,
      message: "Return ID is required",
    });
  }

  if (!adminUserId) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
    });
  }

  try {
    const returnRequest = await approveRefund(id, adminUserId);

    return res.status(200).json({
      success: true,
      message: "Refund approved successfully",
      returnRequest,
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "RETURN_NOT_FOUND") {
        return res.status(404).json({
          success: false,
          message: "Return request not found",
        });
      }

      if (error.message === "RETURN_NOT_APPROVED") {
        return res.status(409).json({
          success: false,
          message:
            "The return must be approved before the refund can be approved",
        });
      }

      if (error.message === "INVALID_REFUND_STATUS") {
        return res.status(409).json({
          success: false,
          message: "This refund is not pending approval",
        });
      }

      if (error.message === "SUPER_ADMIN_APPROVAL_REQUIRED") {
        return res.status(403).json({
          success: false,
          message: "Refunds above ₹10,000 require SUPER_ADMIN approval",
        });
      }
    }

    console.error("Approve refund error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to approve refund",
    });
  }
}

export async function startAdminRefundProcessing(req: Request, res: Response) {
  const id = req.params.id;

  if (typeof id !== "string" || !id) {
    return res.status(400).json({
      success: false,
      message: "Return ID is required",
    });
  }

  try {
    const returnRequest = await startRefundProcessing(id);

    return res.status(200).json({
      success: true,
      message: "Refund processing started",
      returnRequest,
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "RETURN_NOT_FOUND") {
        return res.status(404).json({
          success: false,
          message: "Return request not found",
        });
      }

      if (error.message === "RETURN_NOT_COMPLETED") {
        return res.status(409).json({
          success: false,
          message: "The return must be completed before refund processing",
        });
      }

      if (error.message === "REFUND_NOT_APPROVED") {
        return res.status(409).json({
          success: false,
          message: "Refund approval is required first",
        });
      }
    }

    console.error("Start refund processing error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to start refund processing",
    });
  }
}

export async function completeAdminRefund(req: Request, res: Response) {
  const id = req.params.id;

  if (typeof id !== "string" || !id) {
    return res.status(400).json({
      success: false,
      message: "Return ID is required",
    });
  }

  try {
    const returnRequest = await completeRefund(id);

    return res.status(200).json({
      success: true,
      message: "Refund marked as completed",
      returnRequest,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "INVALID_REFUND_STATUS_TRANSITION"
    ) {
      return res.status(409).json({
        success: false,
        message: "Invalid refund status transition",
      });
    }

    if (error instanceof Error && error.message === "RETURN_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "Return request not found",
      });
    }

    console.error("Complete refund error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to complete refund",
    });
  }
}

export async function failAdminRefund(req: Request, res: Response) {
  const id = req.params.id;

  if (typeof id !== "string" || !id) {
    return res.status(400).json({
      success: false,
      message: "Return ID is required",
    });
  }

  try {
    const returnRequest = await failRefund(id);

    return res.status(200).json({
      success: true,
      message: "Refund marked as failed",
      returnRequest,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "INVALID_REFUND_STATUS_TRANSITION"
    ) {
      return res.status(409).json({
        success: false,
        message: "Invalid refund status transition",
      });
    }

    if (error instanceof Error && error.message === "RETURN_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "Return request not found",
      });
    }

    console.error("Fail refund error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to update refund",
    });
  }
}

export async function retryAdminRefund(req: Request, res: Response) {
  const id = req.params.id;

  if (typeof id !== "string" || !id) {
    return res.status(400).json({
      success: false,
      message: "Return ID is required",
    });
  }

  try {
    const returnRequest = await retryRefund(id);

    return res.status(200).json({
      success: true,
      message: "Refund processing restarted",
      returnRequest,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "INVALID_REFUND_STATUS_TRANSITION"
    ) {
      return res.status(409).json({
        success: false,
        message: "Refund cannot be retried from its current state",
      });
    }

    if (error instanceof Error && error.message === "RETURN_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "Return request not found",
      });
    }

    console.error("Retry refund error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to retry refund",
    });
  }
}
