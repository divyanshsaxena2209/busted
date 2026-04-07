import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';

// ✅ Use correct extensions (VERY IMPORTANT)
import { reportRoutes } from './backend/routes/reports.ts';
import { authRoutes } from './backend/routes/auth.ts';
import newsRoutes from './backend/routes/news.js';
import localNewsRoutes from "./backend/routes/localNews.ts";


// Load environment variables
dotenv.config({ path: '.env.local' });
dotenv.config();

const PORT = 3000;

async function startServer() {
  const app = express();

  // Middlewares
  app.use(cors());
  app.use(express.json());

  // Routes
  app.use('/api/reports', reportRoutes);
  app.use('/api/auth', authRoutes);
  app.use('/api/news', newsRoutes);
  app.use("/api/news/local", localNewsRoutes);

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
    });
  });

  // Dev: attach Vite middleware
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });

    app.use(vite.middlewares);
  } else {
    // Production: serve built files
    app.use(express.static('dist'));
  }

  // Start server
  app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('❌ Server failed to start:', err);
});