import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { loadDatabase, runExpiryAndStockEvaluation } from './server/dataStore.ts';

// Route imports
import authRoutes from './server/routes/authRoutes.ts';
import medicineRoutes from './server/routes/medicineRoutes.ts';
import batchRoutes from './server/routes/batchRoutes.ts';
import inventoryRoutes from './server/routes/inventoryRoutes.ts';
import supplierRoutes from './server/routes/supplierRoutes.ts';
import notificationRoutes from './server/routes/notificationRoutes.ts';
import dashboardRoutes from './server/routes/dashboardRoutes.ts';
import reportRoutes from './server/routes/reportRoutes.ts';
import auditRoutes from './server/routes/auditRoutes.ts';
import settingsRoutes from './server/routes/settingsRoutes.ts';

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // JSON Body Parser
  app.use(express.json());

  // Initialize DB and run initial batch & expiry calculations
  loadDatabase();
  runExpiryAndStockEvaluation();

  // Scheduled background job: runs every 4 hours to re-evaluate batch expiry & stock
  setInterval(() => {
    try {
      const res = runExpiryAndStockEvaluation();
      if (res.updatedBatches > 0 || res.newAlerts > 0) {
        console.log(`[MedExpiry Cron] Evaluated inventory: ${res.updatedBatches} batches updated, ${res.newAlerts} alerts.`);
      }
    } catch (e) {
      console.error('[MedExpiry Cron] Error in background evaluation:', e);
    }
  }, 4 * 60 * 60 * 1000);

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'MedExpiry Core API',
      timestamp: new Date().toISOString(),
    });
  });

  // Mount API routes
  app.use('/api/auth', authRoutes);
  app.use('/api/medicines', medicineRoutes);
  app.use('/api/batches', batchRoutes);
  app.use('/api/inventory', inventoryRoutes);
  app.use('/api/suppliers', supplierRoutes);
  app.use('/api/notifications', notificationRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/reports', reportRoutes);
  app.use('/api/audit-logs', auditRoutes);
  app.use('/api/settings', settingsRoutes);

  // Central error handler for API
  app.use('/api/*', (req, res) => {
    res.status(404).json({ error: `API route ${req.originalUrl} not found` });
  });

  // Vite middleware in development / static serving in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`MedExpiry Server running on port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to launch MedExpiry server:', err);
  process.exit(1);
});
