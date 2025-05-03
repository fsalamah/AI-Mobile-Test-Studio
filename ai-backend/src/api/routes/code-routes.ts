import { Router } from 'express';
import { codeController } from '../controllers/code-controller.js';

export const codeRoutes = Router();

/**
 * @swagger
 * /code/generate:
 *   post:
 *     summary: Generate Page Object Model code
 *     description: Generate code for UI elements in various languages and frameworks
 *     tags: [Code]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               page:
 *                 $ref: '#/components/schemas/Page'
 *               elements:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/ElementWithLocator'
 *               language:
 *                 type: string
 *                 enum: [java, javascript, python, csharp, ruby]
 *               framework:
 *                 type: string
 *                 enum: [appium, selenium, playwright, wdio, oxygen]
 *             required:
 *               - page
 *               - elements
 *               - language
 *     responses:
 *       202:
 *         description: Code generation job created successfully
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
codeRoutes.post('/generate', codeController.generateCode);

/**
 * @swagger
 * /code/languages:
 *   get:
 *     summary: Get supported languages and frameworks
 *     description: Retrieve a list of supported programming languages and frameworks
 *     tags: [Code]
 *     responses:
 *       200:
 *         description: Supported languages and frameworks retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         languages:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: string
 *                               name:
 *                                 type: string
 *                               frameworks:
 *                                 type: array
 *                                 items:
 *                                   type: object
 *                                   properties:
 *                                     id:
 *                                       type: string
 *                                     name:
 *                                       type: string
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
codeRoutes.get('/languages', codeController.getSupportedLanguages);