import { Prisma } from "../generated/prisma/client.js";

/*
 * Refunds above this amount require SUPER_ADMIN approval.
 *
 * Keep this value centralized so the business rule can be changed
 * without searching through multiple controllers/services.
 */
export const SUPER_ADMIN_REFUND_THRESHOLD = new Prisma.Decimal(10000);
