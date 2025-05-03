import { Router } from 'express';
import { AnalysisController } from '../controllers/analysis-controller.js';

// Create router
const router = Router();

// Create controller instance
const analysisController = new AnalysisController();

/**
 * @swagger
 * /analysis/visual:
 *   post:
 *     summary: Analyze visual elements of a page
 *     description: Identifies UI elements and their properties from page screenshots
 *     tags: [Analysis]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               page:
 *                 $ref: '#/components/schemas/Page'
 *               osVersions:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [ios, android]
 *             required:
 *               - page
 *     responses:
 *       202:
 *         description: Analysis job created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/JobResponse'
 *       400:
 *         description: Invalid request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       401:
 *         description: Unauthorized
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
router.post('/visual', analysisController.analyzeVisualElements);

/**
 * @swagger
 * /analysis/xpath:
 *   post:
 *     summary: Generate XPath locators for elements
 *     description: Generate stable XPath locators for UI elements
 *     tags: [Analysis]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               elements:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/Element'
 *               platforms:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [ios, android]
 *             required:
 *               - elements
 *     responses:
 *       202:
 *         description: XPath generation job created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/JobResponse'
 *       400:
 *         description: Invalid request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       401:
 *         description: Unauthorized
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
router.post('/xpath', analysisController.generateXpathLocators);

/**
 * @swagger
 * /analysis/xpath/repair:
 *   post:
 *     summary: Repair failed XPath expressions
 *     description: Fix broken or unreliable XPath locators
 *     tags: [Analysis]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               elements:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/ElementWithLocator'
 *               page:
 *                 $ref: '#/components/schemas/Page'
 *             required:
 *               - elements
 *               - page
 *     responses:
 *       202:
 *         description: XPath repair job created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/JobResponse'
 *       400:
 *         description: Invalid request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       401:
 *         description: Unauthorized
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
router.post('/xpath/repair', analysisController.repairFailedXpaths);

/**
 * @swagger
 * /analysis/pom:
 *   post:
 *     summary: Generate Page Object Model class
 *     description: Generate code for UI elements in various languages and frameworks
 *     tags: [Analysis]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               page:
 *                 $ref: '#/components/schemas/Page'
 *               language:
 *                 type: string
 *                 enum: [java, javascript, python, csharp, ruby]
 *               framework:
 *                 type: string
 *                 enum: [appium, selenium, playwright, wdio, oxygen]
 *             required:
 *               - page
 *     responses:
 *       202:
 *         description: POM generation job created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/JobResponse'
 *       400:
 *         description: Invalid request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       401:
 *         description: Unauthorized
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
router.post('/pom', analysisController.generatePOMClass);

/**
 * @swagger
 * /analysis/progress/{operationId}:
 *   get:
 *     summary: Get progress of an analysis operation
 *     description: Check the status and progress of an ongoing analysis operation
 *     tags: [Analysis]
 *     parameters:
 *       - in: path
 *         name: operationId
 *         schema:
 *           type: string
 *         required: true
 *         description: Operation ID
 *     responses:
 *       200:
 *         description: Operation status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/OperationResponse'
 *       404:
 *         description: Operation not found
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
router.get('/progress/:operationId', analysisController.getAnalysisProgress);

/**
 * @swagger
 * /analysis/operations/{operationId}:
 *   delete:
 *     summary: Cancel an ongoing analysis operation
 *     description: Cancel a running analysis operation
 *     tags: [Analysis]
 *     parameters:
 *       - in: path
 *         name: operationId
 *         schema:
 *           type: string
 *         required: true
 *         description: Operation ID
 *     responses:
 *       200:
 *         description: Operation cancelled successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       404:
 *         description: Operation not found
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
router.delete('/operations/:operationId', analysisController.cancelAnalysisOperation);

// Export router
export const analysisRoutes = router;