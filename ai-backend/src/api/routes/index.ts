import { Router } from 'express';
import { analysisRoutes } from './analysis-routes.js';
import { locatorRoutes } from './locator-routes.js';
import { codeRoutes } from './code-routes.js';
import { jobRoutes } from './job-routes.js';
import { projectRoutes } from './project-routes.js';
import { authenticateApiKey } from '../middlewares/auth.js';

// Create API router
const apiRouter = Router();

/**
 * @swagger
 * /health:
 *   get:
 *     summary: API health check
 *     description: Check if the API is running
 *     tags: [System]
 *     responses:
 *       200:
 *         description: API is running
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 *                 version:
 *                   type: string
 *                   example: 1.0.0
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 */
apiRouter.get('/health', (_req, res) => {
  res.json({ 
    status: 'ok', 
    version: process.env.npm_package_version || '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Apply routes with authentication
apiRouter.use('/analysis', authenticateApiKey, analysisRoutes);
apiRouter.use('/locators', authenticateApiKey, locatorRoutes);
apiRouter.use('/code', authenticateApiKey, codeRoutes);
apiRouter.use('/jobs', authenticateApiKey, jobRoutes);
apiRouter.use('/projects', authenticateApiKey, projectRoutes);

// Export API router
export { apiRouter };