import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { loadDatabase, saveDatabase } from '../dataStore.ts';
import { generateToken, requireAuth, AuthRequest } from '../middleware/auth.ts';

const router = Router();

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required.' });
      return;
    }

    const db = loadDatabase();
    const user = db.users.find(
      (u) => u.email.toLowerCase() === email.trim().toLowerCase()
    );

    if (!user) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    if (!user.isActive) {
      res.status(403).json({ error: 'Account is deactivated. Please contact your administrator.' });
      return;
    }

    // Compare password
    // For demo convenience, also support fallback plain comparison for initial seeds if hash not matched
    let isMatch = false;
    try {
      isMatch = await bcrypt.compare(password, user.passwordHash);
    } catch {
      isMatch = false;
    }

    // Demo fallback for initial password
    if (!isMatch) {
      if (
        (user.email === 'admin@medexpiry.com' && password === 'admin123') ||
        (user.email === 'staff@medexpiry.com' && password === 'staff123')
      ) {
        isMatch = true;
      }
    }

    if (!isMatch) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    const token = generateToken(user);

    // Audit log
    db.auditLogs.unshift({
      id: `aud-${Date.now()}`,
      userId: user.id,
      userName: user.name,
      action: 'USER_LOGIN',
      entity: 'User',
      entityId: user.id,
      oldValue: null,
      newValue: `Logged in from IP ${req.ip || 'client'}`,
      createdAt: new Date().toISOString(),
    });
    saveDatabase();

    const { passwordHash: _, ...safeUser } = user;
    res.json({
      token,
      user: safeUser,
      message: `Welcome back, ${user.name}!`,
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal authentication error.' });
  }
});

// GET /api/auth/me
router.get('/me', requireAuth, (req: AuthRequest, res: Response): void => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized.' });
    return;
  }
  const { passwordHash: _, ...safeUser } = req.user;
  res.json({ user: safeUser });
});

// POST /api/auth/logout
router.post('/logout', requireAuth, (req: AuthRequest, res: Response): void => {
  res.json({ message: 'Successfully logged out.' });
});

export default router;
