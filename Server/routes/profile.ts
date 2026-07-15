import express, { type NextFunction, type Request, type Response } from 'express';
import User from '../models/User';
import authenticateToken from '../middleware/auth';

const router = express.Router();

// Protected route - Get user profile
router.get("/", authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) return res.status(401).json({ error: "Authentication required" });
    const user = await User.findById(req.user.userId).select('-password');
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.status(200).json({
      message: "Profile retrieved successfully",
      user: { email: user.email }
    });
  } catch (error) {
    const caughtError = error instanceof Error ? error : new Error("Unknown profile error");
    console.error("Profile error:", {
      name: caughtError.name,
      message: caughtError.message,
      userId: req.user?.userId // Log userId for debugging but not sensitive data
    });
    next(caughtError);
  }
});

export default router;
