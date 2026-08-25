import { prisma } from "../lib/prisma.js";

export type CreateAddressInput = {
  fullName: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  pinCode: string;
  country?: string;
  isDefault?: boolean;
};

export type UpdateAddressInput = Partial<CreateAddressInput>;

/*
 * Returns only addresses belonging to the authenticated user.
 */
export async function getUserAddresses(userId: string) {
  return prisma.address.findMany({
    where: {
      userId,
    },
    orderBy: [
      {
        isDefault: "desc",
      },
      {
        id: "desc",
      },
    ],
  });
}

/*
 * Creates an address for the authenticated user.
 *
 * If this is the user's first address, it automatically becomes
 * the default address.
 */
export async function createAddress(userId: string, input: CreateAddressInput) {
  return prisma.$transaction(async (tx) => {
    const addressCount = await tx.address.count({
      where: {
        userId,
      },
    });

    const shouldBeDefault = input.isDefault === true || addressCount === 0;

    /*
     * Only one address can be the default.
     *
     * Clear the previous default before creating the new one.
     */
    if (shouldBeDefault) {
      await tx.address.updateMany({
        where: {
          userId,
          isDefault: true,
        },
        data: {
          isDefault: false,
        },
      });
    }

    return tx.address.create({
      data: {
        userId,
        fullName: input.fullName.trim(),
        phone: input.phone.trim(),
        address: input.address.trim(),
        city: input.city.trim(),
        state: input.state.trim(),
        pinCode: input.pinCode.trim(),
        country: input.country?.trim() || "India",
        isDefault: shouldBeDefault,
      },
    });
  });
}

/*
 * Updates an address only if it belongs to the authenticated user.
 */
export async function updateAddress(
  userId: string,
  addressId: string,
  input: UpdateAddressInput,
) {
  return prisma.$transaction(async (tx) => {
    const existingAddress = await tx.address.findFirst({
      where: {
        id: addressId,
        userId,
      },
    });

    if (!existingAddress) {
      throw new Error("ADDRESS_NOT_FOUND");
    }

    if (input.isDefault === true) {
      await tx.address.updateMany({
        where: {
          userId,
          isDefault: true,
          id: {
            not: addressId,
          },
        },
        data: {
          isDefault: false,
        },
      });
    }

    return tx.address.update({
      where: {
        id: addressId,
      },
      data: {
        ...(input.fullName !== undefined && {
          fullName: input.fullName.trim(),
        }),

        ...(input.phone !== undefined && {
          phone: input.phone.trim(),
        }),

        ...(input.address !== undefined && {
          address: input.address.trim(),
        }),

        ...(input.city !== undefined && {
          city: input.city.trim(),
        }),

        ...(input.state !== undefined && {
          state: input.state.trim(),
        }),

        ...(input.pinCode !== undefined && {
          pinCode: input.pinCode.trim(),
        }),

        ...(input.country !== undefined && {
          country: input.country.trim(),
        }),

        ...(input.isDefault !== undefined && {
          isDefault: input.isDefault,
        }),
      },
    });
  });
}

/*
 * Makes one address the user's default address.
 */
export async function setDefaultAddress(userId: string, addressId: string) {
  return prisma.$transaction(async (tx) => {
    const address = await tx.address.findFirst({
      where: {
        id: addressId,
        userId,
      },
    });

    if (!address) {
      throw new Error("ADDRESS_NOT_FOUND");
    }

    await tx.address.updateMany({
      where: {
        userId,
        isDefault: true,
        id: {
          not: addressId,
        },
      },
      data: {
        isDefault: false,
      },
    });

    return tx.address.update({
      where: {
        id: addressId,
      },
      data: {
        isDefault: true,
      },
    });
  });
}

/*
 * Deletes only an address belonging to the authenticated user.
 *
 * If the default address is removed, promote another address
 * to default when one is available.
 */
export async function deleteAddress(userId: string, addressId: string) {
  return prisma.$transaction(async (tx) => {
    const address = await tx.address.findFirst({
      where: {
        id: addressId,
        userId,
      },
    });

    if (!address) {
      throw new Error("ADDRESS_NOT_FOUND");
    }

    await tx.address.delete({
      where: {
        id: addressId,
      },
    });

    if (address.isDefault) {
      const nextAddress = await tx.address.findFirst({
        where: {
          userId,
        },
        orderBy: {
          id: "asc",
        },
      });

      if (nextAddress) {
        await tx.address.update({
          where: {
            id: nextAddress.id,
          },
          data: {
            isDefault: true,
          },
        });
      }
    }
  });
}
