import type { Request, Response } from "express";
import { z } from "zod";
import { getAdminInvoices } from "../services/admin-invoice.service.js";

const invoiceQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),

  limit: z.coerce.number().int().min(1).max(100).default(20),

  search: z.string().trim().min(1).optional(),
});

export async function getAdminInvoiceList(req: Request, res: Response) {
  const result = invoiceQuerySchema.safeParse(req.query);

  if (!result.success) {
    return res.status(400).json({
      success: false,
      message: "Invalid invoice query",
      errors: result.error.flatten(),
    });
  }

  try {
    const data = await getAdminInvoices(result.data);

    return res.status(200).json({
      success: true,
      ...data,
    });
  } catch (error) {
    console.error("Failed to fetch admin invoices:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch invoices",
    });
  }
}
