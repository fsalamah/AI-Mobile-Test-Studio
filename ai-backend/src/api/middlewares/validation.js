import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';

// Schema for state version
const stateVersionSchema = z.object({
  screenShot: z.string().min(1, 'Screenshot is required'),
  pageSource: z.string().min(1, 'Page source is required'),
  deviceInfo: z
    .object({
      platform: z.string().optional(),
      platformVersion: z.string().optional(),
      deviceName: z.string().optional(),
      udid: z.string().optional(),
    })
    .optional(),
});

// Schema for state
const stateSchema = z.object({
  id: z.string().min(1, 'State ID is required'),
  title: z.string().min(1, 'State title is required'),
  description: z.string().optional(),
  versions: z.record(stateVersionSchema),
});

// Schema for page
const pageSchema = z.object({
  id: z.string().min(1, 'Page ID is required'),
  name: z.string().min(1, 'Page name is required'),
  description: z.string().optional(),
  createdAt: z.string().min(1, 'Creation timestamp is required'),
  updatedAt: z.string().optional(),
  states: z.array(stateSchema).min(1, 'At least one state is required'),
  metadata: z.record(z.any()).optional(),
});

// Schema for analysis request
const analysisRequestSchema = z.object({
  page: pageSchema,
  osVersions: z.array(z.string()).optional(),
});

// Middleware to validate analysis request
export const validateAnalysisRequest = (req, res, next) => {
  try {
    const validatedData = analysisRequestSchema.parse(req.body);
    // Replace request body with validated data
    req.body = validatedData;
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: {
          message: 'Validation error',
          code: 'VALIDATION_ERROR',
          details: error.errors,
        },
      });
    } else {
      next(error);
    }
  }
};

// Schema for locator request
const locatorRequestSchema = z.object({
  elements: z.array(
    z.object({
      id: z.string().optional(),
      devName: z.string().min(1, 'Developer name is required'),
      name: z.string().min(1, 'Name is required'),
      description: z.string().min(1, 'Description is required'),
      value: z.string().min(1, 'Value is required'),
      isDynamicValue: z.boolean().optional(),
      stateId: z.string().min(1, 'State ID is required'),
      platform: z.string().optional(),
    })
  ),
  pageSource: z.string().min(1, 'Page source is required'),
  platform: z.string().min(1, 'Platform is required'),
});

// Middleware to validate locator request
export const validateLocatorRequest = (req, res, next) => {
  try {
    const validatedData = locatorRequestSchema.parse(req.body);
    // Replace request body with validated data
    req.body = validatedData;
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: {
          message: 'Validation error',
          code: 'VALIDATION_ERROR',
          details: error.errors,
        },
      });
    } else {
      next(error);
    }
  }
};