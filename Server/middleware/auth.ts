import jwt, { type JwtPayload } from 'jsonwebtoken';
import type { NextFunction, Request, Response } from 'express';

export interface AuthenticatedUser extends JwtPayload {
  userId: string;
  username: string;
}

export const verifyToken = (token: string): AuthenticatedUser => {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error("JWT configuration is missing");
  }

  const payload = jwt.verify(token, jwtSecret);
  if (
    typeof payload === "string" ||
    typeof payload.userId !== "string" ||
    typeof payload.username !== "string"
  ) {
    throw new jwt.JsonWebTokenError("Invalid token payload");
  }

  return payload as AuthenticatedUser;
};

const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: "Access token required" });
  }

  try {
    req.user = verifyToken(token);
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError || error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    return res.status(500).json({ error: "JWT configuration is missing" });
  }
};

export default authenticateToken;
