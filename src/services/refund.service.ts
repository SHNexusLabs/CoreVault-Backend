import { UserRole, RefundStatus } from "../generated/prisma/client.js";

import { prisma } from "../lib/prisma.js";

import { SUPER_ADMIN_REFUND_THRESHOLD } from "../constants/refund.constants.js";

const allowedRefundTransitions: Record<RefundStatus, RefundStatus[]> = {
  NOT_REQUIRED: [],

  PENDING: [RefundStatus.APPROVED, RefundStatus.REJECTED],

  APPROVED: [RefundStatus.PROCESSING],

  PROCESSING: [RefundStatus.COMPLETED, RefundStatus.FAILED],

  COMPLETED: [],

  FAILED: [RefundStatus.PROCESSING],

  REJECTED: [],
};

export async function approveRefund(returnId: string, adminUserId: string) {
  return prisma.$transaction(async (tx) => {
    const returnRequest = await tx.returnRequest.findUnique({
      where: {
        id: returnId,
      },
      select: {
        id: true,
        status: true,
        refundStatus: true,
        refundAmount: true,
      },
    });

    if (!returnRequest) {
      throw new Error("RETURN_NOT_FOUND");
    }

    if (returnRequest.status !== "APPROVED") {
      throw new Error("RETURN_NOT_APPROVED");
    }

    if (returnRequest.refundStatus !== "PENDING") {
      throw new Error("INVALID_REFUND_STATUS");
    }

    const admin = await tx.user.findUnique({
      where: {
        id: adminUserId,
      },
      select: {
        id: true,
        role: true,
      },
    });

    if (!admin) {
      throw new Error("ADMIN_NOT_FOUND");
    }

    /*
     * Refunds above ₹10,000 require SUPER_ADMIN approval.
     */
    if (
      returnRequest.refundAmount.greaterThan(SUPER_ADMIN_REFUND_THRESHOLD) &&
      admin.role !== UserRole.SUPER_ADMIN
    ) {
      throw new Error("SUPER_ADMIN_APPROVAL_REQUIRED");
    }

    return tx.returnRequest.update({
      where: {
        id: returnId,
      },
      data: {
        refundStatus: "APPROVED",
        refundApprovedById: admin.id,
        refundApprovedAt: new Date(),
      },
      include: {
        refundApprovedBy: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });
  });
}

export async function updateRefundStatus(
  returnId: string,
  status: RefundStatus,
) {
  return prisma.$transaction(async (tx) => {
    const returnRequest = await tx.returnRequest.findUnique({
      where: {
        id: returnId,
      },
      select: {
        id: true,
        refundStatus: true,
      },
    });

    if (!returnRequest) {
      throw new Error("RETURN_NOT_FOUND");
    }

    if (
      !allowedRefundTransitions[returnRequest.refundStatus].includes(status)
    ) {
      throw new Error("INVALID_REFUND_STATUS_TRANSITION");
    }

    return tx.returnRequest.update({
      where: {
        id: returnId,
      },
      data: {
        refundStatus: status,
      },
      select: {
        id: true,
        orderId: true,
        refundAmount: true,
        refundStatus: true,
        refundApprovedById: true,
        refundApprovedAt: true,
        updatedAt: true,
      },
    });
  });
}

export async function startRefundProcessing(returnId: string) {
  return prisma.$transaction(async (tx) => {
    const returnRequest = await tx.returnRequest.findUnique({
      where: {
        id: returnId,
      },
      select: {
        id: true,
        status: true,
        refundStatus: true,
        refundAmount: true,
      },
    });

    if (!returnRequest) {
      throw new Error("RETURN_NOT_FOUND");
    }

    if (returnRequest.status !== "COMPLETED") {
      throw new Error("RETURN_NOT_COMPLETED");
    }

    if (returnRequest.refundStatus !== "APPROVED") {
      throw new Error("REFUND_NOT_APPROVED");
    }

    return tx.returnRequest.update({
      where: {
        id: returnId,
      },
      data: {
        refundStatus: "PROCESSING",
      },
      select: {
        id: true,
        orderId: true,
        refundAmount: true,
        refundStatus: true,
        updatedAt: true,
      },
    });
  });
}

export async function completeRefund(returnId: string) {
  return updateRefundStatus(returnId, RefundStatus.COMPLETED);
}

export async function failRefund(returnId: string) {
  return updateRefundStatus(returnId, RefundStatus.FAILED);
}

export async function retryRefund(returnId: string) {
  return updateRefundStatus(returnId, RefundStatus.PROCESSING);
}
