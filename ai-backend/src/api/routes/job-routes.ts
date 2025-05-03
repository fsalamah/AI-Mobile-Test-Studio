import { Router } from 'express';
import { jobController } from '../controllers/job-controller.js';

export const jobRoutes = Router();

/**
 * @swagger
 * /jobs/{jobId}:
 *   get:
 *     summary: Get job status
 *     description: Check the status of a job
 *     tags: [Jobs]
 *     parameters:
 *       - in: path
 *         name: jobId
 *         schema:
 *           type: string
 *         required: true
 *         description: Job ID
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [visual-analysis, xpath-generation, xpath-repair, code-generation]
 *         required: false
 *         description: Job type (defaults to visual-analysis)
 *     responses:
 *       200:
 *         description: Job status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/JobResponse'
 *       404:
 *         description: Job not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 */
jobRoutes.get('/:jobId', jobController.getJobStatus);

/**
 * @swagger
 * /jobs/{jobId}/cancel:
 *   post:
 *     summary: Cancel a job
 *     description: Cancel a running or pending job
 *     tags: [Jobs]
 *     parameters:
 *       - in: path
 *         name: jobId
 *         schema:
 *           type: string
 *         required: true
 *         description: Job ID
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [visual-analysis, xpath-generation, xpath-repair, code-generation]
 *         required: false
 *         description: Job type (defaults to visual-analysis)
 *     responses:
 *       200:
 *         description: Job cancelled successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       404:
 *         description: Job not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 */
jobRoutes.post('/:jobId/cancel', jobController.cancelJob);