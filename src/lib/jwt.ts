import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is not configured");
}

export type AuthTokenPayload = {
  userId: string;
  role: "CUSTOMER" | "ADMIN" | "SUPER_ADMIN";
};

export function createAccessToken(payload: AuthTokenPayload) {
  return jwt.sign(payload, JWT_SECRET as string, {
    expiresIn: "7d",
  });
}