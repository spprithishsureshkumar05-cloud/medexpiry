import { Router, Response } from 'express';
import { loadDatabase } from '../dataStore.ts';
import { requireAuth, requireAdmin, AuthRequest } from '../middleware/auth.ts';

const router = Router();

// GET /api/audit-logs (Admin only)
router.get('/', requireAuth, requireAdmin, (req: AuthRequest, res: Response): void => {
  const db = loadDatabase();
  const search = ((req.query.search as string) || '').toLowerCase().trim();
  const action = (req.query.action as string) || '';
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 25;

  let filtered = db.auditLogs.filter((log) => {
    if (action && log.action !== action) return false;
    if (search) {
      const matchAction = log.action.toLowerCase().includes(search);
      const matchEntity = log.entity.toLowerCase().includes(search);
      const matchUser = log.userName.toLowerCase().includes(search);
      const matchNew = (log.newValue || '').toLowerCase().includes(search);
      return matchAction || matchEntity || matchUser || matchNew;
    }
    return true;
  });

  filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const total = filtered.length;
  const startIndex = (page - 1) * limit;
  const paginated = filtered.slice(startIndex, startIndex + limit);

  res.json({
    data: paginated,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  });
});

export default router;
