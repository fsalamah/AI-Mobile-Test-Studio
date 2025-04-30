import { z } from 'zod';

// Original schema for visual element analysis
export const createOsSpecifVisualElementSchema = (possibleStateIds) => {
  return z.array(
    z.object({
      devName: z.string(),
      name: z.string(),
      description: z.string(),
      value: z.string(),
      isDynamicValue: z.boolean().optional().nullable().default(false),
      stateId: z.enum(possibleStateIds),
    })
  );
};

// Original schema for XPath locator generation
export const createXpathLocatorSchema = (stateId) =>
  z.array(
    z.object({
      devName: z.string(),
      name: z.string(),
      description: z.string(),
      value: z.string(),
      isDynamicValue: z.boolean().optional().nullable().default(false),
      stateId: z.literal(`state.${stateId}`),
      xpathLocator: z.string().min(1, "xpathLocator must not be empty"),
    })
  );

// Schema for an individual XPath fix item
const xpathFixItemSchema = z.object({
  priority: z.number().int().min(0).max(2), 
  xpath: z.string().min(1),
  confidence: z.enum(["High", "Medium", "Low"]),
  description: z.string().optional().nullable(),
  fix: z.string(),
});

// Schema for the failing element with XPath fixes
export const createXpathRepairSchema = (stateId) =>
  z.array(
    z.object({
      devName: z.string(),
      name: z.string(),
      description: z.string(),
      value: z.string(),
      isDynamicValue: z.boolean().optional().nullable().default(false),
      stateId: z.union([z.literal(`state.${stateId}`), z.literal(stateId)]),
      platform: z.enum(["android", "ios"]),
      id: z.string().optional().nullable(),
      
      // Original failing XPath information
      xpath: z.object({
        xpathExpression: z.string(),
        numberOfMatches: z.number().int(),
        matchingNodes: z.array(z.string()),
        isValid: z.boolean(),
        success: z.boolean().optional().nullable()
      }),
      
      // XPath fixes array
      xpathFix: z.array(xpathFixItemSchema)
        .min(1)
        .max(3)
    })
  );