import express from 'express';
import authRoutes from './auth';
import profileRoutes from './profile';

const router = express.Router();

// Mount routes
router.use('/auth', authRoutes);
router.use('/profile', profileRoutes);

// Health check route
router.get('/health', (_req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

export default router;
