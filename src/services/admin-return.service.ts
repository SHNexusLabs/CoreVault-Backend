import { ReturnStatus } from "../generated/prisma/client.js";

import { prisma } from "../lib/prisma.js";

const allowedTransitions: Record<ReturnStatus, ReturnStatus[]> = {
  REQUESTED: [
    ReturnStatus.APPROVED,
    ReturnStatus.REJECTED,
    ReturnStatus.CANCELLED,
  ],

  APPROVED: [ReturnStatus.RECEIVED, ReturnStatus.CANCELLED],

  REJECTED: [],

  RECEIVED: [ReturnStatus.COMPLETED],

  COMPLETED: [],

  CANCELLED: [],
};

export async function getAdminReturns() {
  return prisma.returnRequest.findMany({
    orderBy: {
      createdAt: "desc",
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
        },
      },
      order: {
        select: {
          id: true,
          orderNumber: true,
          status: true,
          total: true,
        },
      },
      items: {
        include: {
          orderItem: {
            select: {
              id: true,
              productId: true,
              productName: true,
              sku: true,
              unitPrice: true,
              quantity: true,
              subtotal: true,
            },
          },
        },
      },
      approvedBy: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
    },
  });
}

export async function getAdminReturn(returnId: string) {
  const returnRequest = await prisma.returnRequest.findUnique({
    where: {
      id: returnId,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
        },
      },
      order: {
        select: {
          id: true,
          orderNumber: true,
          status: true,
          total: true,
        },
      },
      items: {
        include: {
          orderItem: true,
        },
      },
      approvedBy: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
    },
  });

  if (!returnRequest) {
    throw new Error("RETURN_NOT_FOUND");
  }

  return returnRequest;
}

export async function updateReturnStatus(
  returnId: string,
  status: ReturnStatus,
) {
  return prisma.$transaction(async (tx) => {
    const returnRequest = await tx.returnRequest.findUnique({
      where: {
        id: returnId,
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (!returnRequest) {
      throw new Error("RETURN_NOT_FOUND");
    }

    if (!allowedTransitions[returnRequest.status].includes(status)) {
      throw new Error("INVALID_RETURN_STATUS_TRANSITION");
    }

    return tx.returnRequest.update({
      where: {
        id: returnId,
      },
      data: {
        status,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        order: {
          select: {
            id: true,
            orderNumber: true,
            status: true,
            total: true,
          },
        },
        items: {
          include: {
            orderItem: true,
          },
        },
      },
    });
  });
}
