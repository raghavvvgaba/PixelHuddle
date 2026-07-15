import type { RequestHandler } from 'express';
import { sanitizeInput } from '../utils/helpers';

// NoSQL injection prevention middleware
const noSQLInjectionProtection: RequestHandler = (req, res, next) => {
  // Check for potential NoSQL injection in query parameters
  if (req.query) {
    for (const key in req.query) {
      if (typeof req.query[key] === 'string' && req.query[key].includes('$')) {
        return res.status(400).json({ error: "Invalid query parameters" });
      }
    }
  }
  next();
};

// Input sanitization middleware
const inputSanitization: RequestHandler = (req, _res, next) => {
  // Sanitize body data
  if (req.body) {
    for (const key in req.body) {
      if (typeof req.body[key] === 'string') {
        req.body[key] = sanitizeInput(req.body[key]);
      }
    }
  }
  
  // Sanitize query parameters
  if (req.query) {
    for (const key in req.query) {
      if (typeof req.query[key] === 'string') {
        req.query[key] = sanitizeInput(req.query[key]);
      }
    }
  }
  
  next();
};

export {
  noSQLInjectionProtection,
  inputSanitization
};
