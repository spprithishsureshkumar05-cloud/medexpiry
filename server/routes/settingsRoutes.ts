import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { loadDatabase, saveDatabase, User } from '../dataStore.ts';
import { requireAuth, requireAdmin, AuthRequest } from '../middleware/auth.ts';

const router = Router();

// GET /api/settings
router.get('/', requireAuth, (req: AuthRequest, res: Response): void => {
  const db = loadDatabase();
  res.json({ settings: db.settings });
});

// PUT /api/settings (Admin only)
router.put('/', requireAuth, requireAdmin, (req: AuthRequest, res: Response): void => {
  const db = loadDatabase();
  const { warningPeriodDays, criticalPeriodDays, mediumPeriodDays, pharmacyName, pharmacyAddress, licenseNo } =
    req.body;

  if (warningPeriodDays !== undefined) {
    const days = parseInt(warningPeriodDays);
    if (!isNaN(days) && days > 0) db.settings.warningPeriodDays = days;
  }
  if (criticalPeriodDays !== undefined) {
    const days = parseInt(criticalPeriodDays);
    if (!isNaN(days) && days > 0) db.settings.criticalPeriodDays = days;
  }
  if (mediumPeriodDays !== undefined) {
    const days = parseInt(mediumPeriodDays);
    if (!isNaN(days) && days > 0) db.settings.mediumPeriodDays = days;
  }
  if (pharmacyName) db.settings.pharmacyName = pharmacyName.trim();
  if (pharmacyAddress) db.settings.pharmacyAddress = pharmacyAddress.trim();
  if (licenseNo) db.settings.licenseNo = licenseNo.trim();

  db.auditLogs.unshift({
    id: `aud-${Date.now()}`,
    userId: req.user!.id,
    userName: req.user!.name,
    action: 'SETTINGS_UPDATED',
    entity: 'SystemSettings',
    entityId: 'settings',
    oldValue: null,
    newValue: `Updated warning thresholds to: Warning ${db.settings.warningPeriodDays}d, Critical ${db.settings.criticalPeriodDays}d`,
    createdAt: new Date().toISOString(),
  });

  saveDatabase();
  res.json({ message: 'Settings successfully updated.', settings: db.settings });
});

// GET /api/settings/users (Admin only)
router.get('/users', requireAuth, requireAdmin, (req: AuthRequest, res: Response): void => {
  const db = loadDatabase();
  const safeUsers = db.users.map(({ passwordHash: _, ...u }) => u);
  res.json({ users: safeUsers });
});

// POST /api/settings/users (Admin only)
router.post('/users', requireAuth, requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  const db = loadDatabase();
  const { name, email, password, role } = req.body;

  if (!name || !email || !password || !role) {
    res.status(400).json({ error: 'Name, email, password, and role are required.' });
    return;
  }

  const existing = db.users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
  if (existing) {
    res.status(409).json({ error: 'User with this email already exists.' });
    return;
  }

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);
  const now = new Date().toISOString();

  const newUser: User = {
    id: `usr-${Date.now()}`,
    name: name.trim(),
    email: email.trim().toLowerCase(),
    passwordHash,
    role: role === 'ADMIN' ? 'ADMIN' : 'STAFF',
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };

  db.users.push(newUser);

  db.auditLogs.unshift({
    id: `aud-${Date.now()}`,
    userId: req.user!.id,
    userName: req.user!.name,
    action: 'USER_CREATED',
    entity: 'User',
    entityId: newUser.id,
    oldValue: null,
    newValue: `Created ${newUser.role} user: ${newUser.name} (${newUser.email})`,
    createdAt: now,
  });

  saveDatabase();
  const { passwordHash: _, ...safeUser } = newUser;
  res.status(201).json(safeUser);
});

// PATCH /api/settings/users/:id/toggle (Admin only)
router.patch('/users/:id/toggle', requireAuth, requireAdmin, (req: AuthRequest, res: Response): void => {
  const db = loadDatabase();
  const user = db.users.find((u) => u.id === req.params.id);

  if (!user) {
    res.status(404).json({ error: 'User not found.' });
    return;
  }

  if (user.id === req.user!.id) {
    res.status(400).json({ error: 'You cannot deactivate your own active session.' });
    return;
  }

  user.isActive = !user.isActive;
  user.updatedAt = new Date().toISOString();

  db.auditLogs.unshift({
    id: `aud-${Date.now()}`,
    userId: req.user!.id,
    userName: req.user!.name,
    action: 'USER_STATUS_TOGGLED',
    entity: 'User',
    entityId: user.id,
    oldValue: `Active: ${!user.isActive}`,
    newValue: `Active: ${user.isActive}`,
    createdAt: new Date().toISOString(),
  });

  saveDatabase();
  const { passwordHash: _, ...safeUser } = user;
  res.json({ message: `User status changed to ${user.isActive ? 'Active' : 'Inactive'}.`, user: safeUser });
});

// DELETE /api/settings/users/:id (Admin only)
router.delete('/users/:id', requireAuth, requireAdmin, (req: AuthRequest, res: Response): void => {
  const db = loadDatabase();
  const userIndex = db.users.findIndex((u) => u.id === req.params.id);

  if (userIndex === -1) {
    res.status(404).json({ error: 'User not found.' });
    return;
  }

  const user = db.users[userIndex];

  if (user.id === req.user!.id) {
    res.status(400).json({ error: 'You cannot delete your own active administrator session.' });
    return;
  }

  db.users.splice(userIndex, 1);

  db.auditLogs.unshift({
    id: `aud-${Date.now()}`,
    userId: req.user!.id,
    userName: req.user!.name,
    action: 'USER_DELETED',
    entity: 'User',
    entityId: user.id,
    oldValue: `Deleted user: ${user.name} (${user.email})`,
    newValue: null,
    createdAt: new Date().toISOString(),
  });

  saveDatabase();
  res.json({ message: `User ${user.name} deleted successfully.` });
});

export default router;
