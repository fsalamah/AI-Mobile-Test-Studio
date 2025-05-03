import { Router } from 'express';
import { locatorController } from '../controllers/locator-controller.js';
import { validateLocatorRequest } from '../middlewares/validation.js';

export const locatorRoutes = Router();

/**
 * @swagger
 * /locators/generate:
 *   post:
 *     summary: Generate XPath locators for elements
 *     description: Generate stable XPath locators for UI elements
 *     tags: [Locators]
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
 *               pageSource:
 *                 type: string
 *               platform:
 *                 type: string
 *                 enum: [ios, android]
 *             required:
 *               - elements
 *               - pageSource
 *               - platform
 *     responses:
 *       202:
 *         description: Locator generation job created successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/JobResponse'
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
locatorRoutes.post('/generate', validateLocatorRequest, locatorController.generateLocators);

/**
 * @swagger
 * /locators/repair:
 *   post:
 *     summary: Repair failing XPath locators
 *     description: Fix broken or unreliable XPath locators
 *     tags: [Locators]
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
 *               pageSource:
 *                 type: string
 *               platform:
 *                 type: string
 *                 enum: [ios, android]
 *             required:
 *               - elements
 *               - pageSource
 *               - platform
 *     responses:
 *       202:
 *         description: Locator repair job created successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/JobResponse'
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
locatorRoutes.post('/repair', validateLocatorRequest, locatorController.repairLocators);