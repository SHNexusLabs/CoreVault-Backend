import type { UserRole } from "../generated/prisma/client.js";

declare global {
  namespace Express {
    interface Request {
      /*
       * Added by auth.middleware.ts after the JWT
       * has been successfully verified.
       */
      user?: {
        id: string;
        role: UserRole;
      };
    }
  }
}

export {};
