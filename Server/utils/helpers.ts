import xss from 'xss';
import jwt, { type SignOptions } from 'jsonwebtoken';
import type { Types } from 'mongoose';

// Custom error classes
class ValidationError extends Error {
  statusCode: number;

  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
    this.statusCode = 400;
  }
}

class DatabaseError extends Error {
  statusCode: number;

  constructor(message: string) {
    super(message);
    this.name = 'DatabaseError';
    this.statusCode = 500;
  }
}

// Input sanitization function
const sanitizeInput = (input: string) => {
  if (typeof input !== 'string') return input;
  return xss(input.trim());
};

// Generate JWT token
const generateToken = (userId: Types.ObjectId | string, username: string) => {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) throw new Error("JWT_SECRET is required");
  const expiresIn = (process.env.JWT_EXPIRES_IN || "7d") as SignOptions["expiresIn"];
  return jwt.sign(
    { userId: userId.toString(), username },
    jwtSecret,
    { expiresIn }
  );
};

// Validate required fields
const validateRequiredFields = <T extends Record<string, unknown>>(
  data: T,
  requiredFields: Array<keyof T>,
) => {
  const missingFields = requiredFields.filter(field => !data[field]);
  if (missingFields.length > 0) {
    throw new ValidationError(`${missingFields.join(', ')} are required`);
  }
};

export {
  ValidationError,
  DatabaseError,
  sanitizeInput,
  generateToken,
  validateRequiredFields
};
