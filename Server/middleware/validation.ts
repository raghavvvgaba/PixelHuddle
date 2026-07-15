import type { RequestHandler } from 'express';
import { body, validationResult } from 'express-validator';

// Signup validation rules
const signupValidation = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters'),
  body('email')
    .trim()
    .isEmail()
    .withMessage('Please enter a valid email address')
    .normalizeEmail(),
  body('password')
    .trim()
    .isLength({ min: 1 })
    .withMessage('Password is required')
];

// Login validation rules
const loginValidation = [
  body('username')
    .trim()
    .notEmpty()
    .withMessage('Username or email is required'),
  body('password')
    .trim()
    .notEmpty()
    .withMessage('Password is required')
];

// Handle validation errors
const handleValidationErrors: RequestHandler = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0]?.msg || "Invalid request" });
  }
  next();
};

export {
  signupValidation,
  loginValidation,
  handleValidationErrors
};
