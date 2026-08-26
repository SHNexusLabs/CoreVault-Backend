import type { Request, Response } from "express";
import { z } from "zod";

import {
  getAdminCustomer,
  getAdminCustomers,
  updateCustomerStatus,
} from "../services/admin-customer.service.js";

const customerQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),

  limit: z.coerce.number().int().min(1).max(100).default(20),

  search: z.string().trim().min(1).optional(),

  isActive: z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .optional(),
});

const updateCustomerStatusSchema = z.object({
  isActive: z.boolean(),
});

export async function getAdminCustomerList(req: Request, res: Response) {
  const result = customerQuerySchema.safeParse(req.query);

  if (!result.success) {
    return res.status(400).json({
      success: false,
      message: "Invalid customer query",
      errors: result.error.flatten().fieldErrors,
    });
  }

  try {
    const data = await getAdminCustomers(result.data);

    return res.status(200).json({
      success: true,
      ...data,
    });
  } catch (error) {
    console.error("Get admin customers error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve customers",
    });
  }
}

export async function getAdminCustomerDetails(req: Request, res: Response) {
  const id = req.params.id;

  if (typeof id !== "string" || !id) {
    return res.status(400).json({
      success: false,
      message: "Customer ID is required",
    });
  }

  try {
    const customer = await getAdminCustomer(id);

    return res.status(200).json({
      success: true,
      customer,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "CUSTOMER_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    console.error("Get admin customer error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve customer",
    });
  }
}

export async function updateAdminCustomerStatus(req: Request, res: Response) {
  const id = req.params.id;

  if (typeof id !== "string" || !id) {
    return res.status(400).json({
      success: false,
      message: "Customer ID is required",
    });
  }

  const result = updateCustomerStatusSchema.safeParse(req.body);

  if (!result.success) {
    return res.status(400).json({
      success: false,
      message: "Invalid customer status",
      errors: result.error.flatten().fieldErrors,
    });
  }

  try {
    const customer = await updateCustomerStatus(id, result.data.isActive);

    return res.status(200).json({
      success: true,
      message: result.data.isActive
        ? "Customer account enabled successfully"
        : "Customer account disabled successfully",
      customer,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "CUSTOMER_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    console.error("Update customer status error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to update customer status",
    });
  }
}
