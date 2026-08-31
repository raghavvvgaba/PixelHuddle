import express, { type NextFunction, type Request, type Response } from 'express';
import bcrypt from 'bcrypt';
import mongoose from 'mongoose';
import User from '../models/User';
import { signupValidation, loginValidation, handleValidationErrors } from '../middleware/validation';
import { signupLimiter, loginLimiter } from '../middleware/rateLimiter';
import { ValidationError, generateToken, validateRequiredFields } from '../utils/helpers';

interface SignupBody {
  username: string;
  email: string;
  password: string;
}

interface LoginBody {
  username: string;
  password: string;
}

const router = express.Router();

// Sign Up
router.post("/signup", 
  signupLimiter,
  signupValidation,
  handleValidationErrors,
  async (req: Request<unknown, unknown, SignupBody>, res: Response, next: NextFunction) => {
    const session = await mongoose.startSession();
    
    try {
      const { username, email, password } = req.body;

      // Validate required fields
      validateRequiredFields({ username, email, password }, ['username', 'email', 'password']);

      await session.withTransaction(async () => {
        // Check if username already exists
        const existingUsername = await User.findOne({ username }).session(session);
        if (existingUsername) {
          throw new ValidationError('Username already exists');
        }

        // Check if email already exists
        const existingEmail = await User.findOne({ email }).session(session);
        if (existingEmail) {
          throw new ValidationError('Email already exists');
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create new user
        const newUser = new User({
          username,
          email,
          password: hashedPassword
        });

        await newUser.save({ session });

        // Generate JWT token for automatic login
        const token = generateToken(newUser._id, newUser.username);

        return res.status(201).json({ 
          message: "Signup successful", 
          user: { id: newUser._id.toString(), username: newUser.username, email: newUser.email },
          token: token,
          expiresIn: process.env.JWT_EXPIRES_IN
        });
      });

    } catch (error) {
      const caughtError = error instanceof Error ? error : new Error("Unknown signup error");
      console.error("Signup error:", {
        name: caughtError.name,
        message: caughtError.message,
        username: req.body.username
      });
      next(caughtError);
    } finally {
      await session.endSession();
    }
  }
);

// Login
router.post("/login", 
  loginLimiter,
  loginValidation,
  handleValidationErrors,
  async (req: Request<unknown, unknown, LoginBody>, res: Response, next: NextFunction) => {
    try {
      const { username, password } = req.body;

      // Validate required fields
      validateRequiredFields({ username, password }, ['username', 'password']);

      // Find user by username or email
      const user = await User.findOne({
        $or: [{ username }, { email: username }]
      });
      
      if (!user) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      // Check password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      // Generate JWT token
      const token = generateToken(user._id, user.username);

      return res.status(200).json({ 
        message: "Login successful", 
        user: { id: user._id.toString(), username: user.username, email: user.email },
        token: token,
        expiresIn: process.env.JWT_EXPIRES_IN
      });
    } catch (error) {
      const caughtError = error instanceof Error ? error : new Error("Unknown login error");
      console.error("Login error:", {
        name: caughtError.name,
        message: caughtError.message,
        username: req.body.username
      });
      next(caughtError);
    }
  }
);

export default router;
