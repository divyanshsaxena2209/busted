import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';

// ✅ IMPORTANT: Use correct extensions for runtime
import { reportRoutes } from './backend/routes/reports.ts';
import { authRoutes } from './backend/routes/auth.ts';
import { newsRoutes } from './backend/routes/news.ts';

// Load environment variables
dotenv.config({ path: '.env.local' });
dotenv.config();

const PORT = 3000;

async function startServer() {
  const app = express();

  // ─────────────────────────────────────────────
  // Middlewares
  // ─────────────────────────────────────────────
  app.use(cors());
  app.use(express.json());

  // ─────────────────────────────────────────────
  // API Routes (ORDER MATTERS ⚠️)
  // ─────────────────────────────────────────────

  app.use('/api/reports', reportRoutes);
  app.use('/api/auth', authRoutes);

  // ✅ FIX: more specific route FIRST
  app.use('/api/news', newsRoutes);

  // ─────────────────────────────────────────────
  // Health Check
  // ─────────────────────────────────────────────
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
    });
  });

  // ─────────────────────────────────────────────
  // Vite (Dev / Prod handling)
  // ─────────────────────────────────────────────
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });

    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
  }

  // ─────────────────────────────────────────────
  // Start Server
  // ─────────────────────────────────────────────
  app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
  });
}

// ─────────────────────────────────────────────
// Start + Error Handling
// ─────────────────────────────────────────────
startServer().catch((err) => {
  console.error('❌ Server failed to start:', err);
});
