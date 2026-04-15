import { Router, Response } from 'express';
import {
  verifyGoogleToken,
  findOrCreateUser,
  generateJWT,
  getUserById,
} from '../services/authService';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

// Google OAuth callback
router.post('/auth/google', async (req: AuthRequest, res: Response) => {
  try {
    const { token } = req.body;

    if (!token) {
      res.status(400).json({ error: 'Token is required' });
      return;
    }

    // Verify Google token
    const googleData = await verifyGoogleToken(token);

    // Find or create user
    const user = await findOrCreateUser(
      googleData.googleId,
      googleData.email,
      googleData.name,
      googleData.pictureUrl
    );

    // Generate JWT
    const jwtToken = generateJWT(user.id, user.email);

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        picture: user.pictureUrl,
        isAdmin: user.isAdmin,
      },
      token: jwtToken,
    });
  } catch (error) {
    console.error('Auth error:', error);
    res.status(401).json({ error: 'Authentication failed' });
  }
});

// Get current user profile
router.get('/auth/profile', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const user = await getUserById(req.userId);

    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      picture: user.pictureUrl,
      isAdmin: user.isAdmin,
    });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ error: 'Failed to get profile' });
  }
});

export default router;
