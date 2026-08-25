import type { Request, Response } from "express";
import { z } from "zod";

import {
  createAddress,
  deleteAddress,
  getUserAddresses,
  setDefaultAddress,
  updateAddress,
} from "../services/address.service.js";

const addressSchema = z.object({
  fullName: z.string().trim().min(2),
  phone: z.string().trim().min(7),
  address: z.string().trim().min(5),
  city: z.string().trim().min(2),
  state: z.string().trim().min(2),
  pinCode: z.string().trim().min(4),
  country: z.string().trim().min(2).optional(),
  isDefault: z.boolean().optional(),
});

const updateAddressSchema = addressSchema.partial();

/*
 * GET /api/addresses
 *
 * Returns addresses belonging only to the authenticated user.
 */
export async function getCustomerAddresses(req: Request, res: Response) {
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
    });
  }

  try {
    const addresses = await getUserAddresses(userId);

    return res.status(200).json({
      success: true,
      addresses,
    });
  } catch (error) {
    console.error("Get addresses error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve addresses",
    });
  }
}

/*
 * POST /api/addresses
 *
 * Creates a new address for the authenticated user.
 */
export async function createCustomerAddress(req: Request, res: Response) {
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
    });
  }

  const result = addressSchema.safeParse(req.body);

  if (!result.success) {
    return res.status(400).json({
      success: false,
      message: "Invalid address data",
      errors: result.error.flatten().fieldErrors,
    });
  }

  try {
    const address = await createAddress(userId, result.data);

    return res.status(201).json({
      success: true,
      message: "Address created successfully",
      address,
    });
  } catch (error) {
    console.error("Create address error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to create address",
    });
  }
}

/*
 * PATCH /api/addresses/:id
 */
export async function updateCustomerAddress(req: Request, res: Response) {
  const userId = req.user?.id;
  const addressId = req.params.id;

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
    });
  }

  if (typeof addressId !== "string" || !addressId) {
    return res.status(400).json({
      success: false,
      message: "Address ID is required",
    });
  }

  const result = updateAddressSchema.safeParse(req.body);

  if (!result.success) {
    return res.status(400).json({
      success: false,
      message: "Invalid address data",
      errors: result.error.flatten().fieldErrors,
    });
  }

  try {
    const address = await updateAddress(userId, addressId, result.data);

    return res.status(200).json({
      success: true,
      message: "Address updated successfully",
      address,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "ADDRESS_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "Address not found",
      });
    }

    console.error("Update address error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to update address",
    });
  }
}

/*
 * PATCH /api/addresses/:id/default
 *
 * Makes the selected address the user's default address.
 */
export async function setCustomerDefaultAddress(req: Request, res: Response) {
  const userId = req.user?.id;
  const addressId = req.params.id;

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
    });
  }

  if (typeof addressId !== "string" || !addressId) {
    return res.status(400).json({
      success: false,
      message: "Address ID is required",
    });
  }

  try {
    const address = await setDefaultAddress(userId, addressId);

    return res.status(200).json({
      success: true,
      message: "Default address updated successfully",
      address,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "ADDRESS_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "Address not found",
      });
    }

    console.error("Set default address error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to update default address",
    });
  }
}

/*
 * DELETE /api/addresses/:id
 */
export async function deleteCustomerAddress(req: Request, res: Response) {
  const userId = req.user?.id;
  const addressId = req.params.id;

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
    });
  }

  if (typeof addressId !== "string" || !addressId) {
    return res.status(400).json({
      success: false,
      message: "Address ID is required",
    });
  }

  try {
    await deleteAddress(userId, addressId);

    return res.status(200).json({
      success: true,
      message: "Address deleted successfully",
    });
  } catch (error) {
    if (error instanceof Error && error.message === "ADDRESS_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "Address not found",
      });
    }

    console.error("Delete address error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to delete address",
    });
  }
}
