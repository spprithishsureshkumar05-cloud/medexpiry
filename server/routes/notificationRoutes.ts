import { Router, Response } from 'express';
import { loadDatabase, saveDatabase, runExpiryAndStockEvaluation } from '../dataStore.ts';
import { requireAuth, AuthRequest } from '../middleware/auth.ts';

const router = Router();

// GET /api/notifications
router.get('/', requireAuth, (req: AuthRequest, res: Response): void => {
  const db = loadDatabase();
  const type = req.query.type as string;

  let list = db.notifications;
  if (type) {
    list = list.filter((n) => n.type === type);
  }

  const unreadCount = db.notifications.filter((n) => !n.isRead).length;

  res.json({
    notifications: list,
    unreadCount,
    totalCount: list.length,
  });
});

// PATCH /api/notifications/:id/read
router.patch('/:id/read', requireAuth, (req: AuthRequest, res: Response): void => {
  const db = loadDatabase();
  const notif = db.notifications.find((n) => n.id === req.params.id);

  if (!notif) {
    res.status(404).json({ error: 'Notification not found.' });
    return;
  }

  notif.isRead = true;
  saveDatabase();

  res.json({ success: true, notification: notif });
});

// PATCH /api/notifications/read-all
router.patch('/read-all', requireAuth, (req: AuthRequest, res: Response): void => {
  const db = loadDatabase();
  db.notifications.forEach((n) => {
    n.isRead = true;
  });
  saveDatabase();

  res.json({ success: true, message: 'All notifications marked as read.' });
});

// DELETE /api/notifications/:id
router.delete('/:id', requireAuth, (req: AuthRequest, res: Response): void => {
  const db = loadDatabase();
  db.notifications = db.notifications.filter((n) => n.id !== req.params.id);
  saveDatabase();

  res.json({ success: true, message: 'Notification removed.' });
});

// POST /api/notifications/evaluate
// Manually triggers the automated background job to evaluate expiry and stock
router.post('/evaluate', requireAuth, (req: AuthRequest, res: Response): void => {
  const result = runExpiryAndStockEvaluation();
  const db = loadDatabase();
  const unreadCount = db.notifications.filter((n) => !n.isRead).length;

  res.json({
    message: 'System audit and expiry check completed successfully.',
    updatedBatches: result.updatedBatches,
    newAlertsGenerated: result.newAlerts,
    unreadCount,
  });
});

export default router;
