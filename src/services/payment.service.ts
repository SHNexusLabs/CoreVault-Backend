import { PaymentMethod, PaymentStatus } from "../generated/prisma/client.js";

import { prisma } from "../lib/prisma.js";

const allowedPaymentTransitions: Record<PaymentStatus, PaymentStatus[]> = {
  PENDING: [PaymentStatus.PAID, PaymentStatus.FAILED],

  PAID: [PaymentStatus.REFUNDED],

  FAILED: [PaymentStatus.PENDING],

  REFUNDED: [],
};

/*
 * Updates the payment status of an order.
 *
 * This function is intentionally kept in the service layer
 * so payment-state rules cannot be bypassed by controllers.
 */
export async function updatePaymentStatus(
  orderId: string,
  status: PaymentStatus,
) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: {
        id: orderId,
      },
      select: {
        id: true,
        paymentMethod: true,
        paymentStatus: true,
      },
    });

    if (!order) {
      throw new Error("ORDER_NOT_FOUND");
    }

    if (!allowedPaymentTransitions[order.paymentStatus].includes(status)) {
      throw new Error("INVALID_PAYMENT_STATUS_TRANSITION");
    }

    return tx.order.update({
      where: {
        id: orderId,
      },
      data: {
        paymentStatus: status,
      },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        paymentMethod: true,
        paymentStatus: true,
        total: true,
        updatedAt: true,
      },
    });
  });
}

/*
 * Returns the payment information for an order belonging
 * to the authenticated user.
 */
export async function getUserPaymentStatus(userId: string, orderId: string) {
  const order = await prisma.order.findFirst({
    where: {
      id: orderId,
      userId,
    },
    select: {
      id: true,
      orderNumber: true,
      status: true,
      paymentMethod: true,
      paymentStatus: true,
      total: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!order) {
    throw new Error("ORDER_NOT_FOUND");
  }

  return order;
}

/*
 * COD orders do not require an online payment attempt.
 *
 * The order remains PENDING until the actual cash payment
 * is collected.
 */
export function validatePaymentMethod(paymentMethod: PaymentMethod) {
  if (paymentMethod === PaymentMethod.COD) {
    return {
      requiresOnlinePayment: false,
    };
  }

  return {
    requiresOnlinePayment: true,
  };
}
