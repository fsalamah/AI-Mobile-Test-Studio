import { z } from 'zod';

// Schema for an individual XPath fix item
const xpathFixItemSchema = z.object({
  priority: z.number().int().min(0).max(2),
  xpath: z.string().min(1),
  confidence: z.enum(['High', 'Medium', 'Low']),
  description: z.string().nullable(),
  fix: z.string(),
});

/**
 * Schema for XPath repair
 * @param stateId State ID for validation
 * @returns Zod schema for XPath repair
 */
export const createXpathRepairSchema = (stateId: string) =>
  z.array(
    z.object({
      devName: z.string().min(1, 'Developer name is required'),
      name: z.string().min(1, 'Name is required'),
      description: z.string().min(1, 'Description is required'),
      value: z.string(),
      isDynamicValue: z.boolean().nullable().default(false),
      stateId: z.union([z.literal(`state.${stateId}`), z.literal(stateId)]),
      platform: z.enum(['android', 'ios']),
      id: z.string().nullable(),
      
      // Original failing XPath information
      xpath: z.object({
        xpathExpression: z.string(),
        numberOfMatches: z.number().int(),
        matchingNodes: z.array(z.string()),
        isValid: z.boolean(),
        success: z.boolean().nullable(),
      }),
      
      // XPath fixes array
      xpathFix: z.array(xpathFixItemSchema)
        .min(1)
        .max(3),
    })
  );

/**
 * Convert schema to JSON Schema format for OpenAI
 * @param schemaFunction Schema function to convert
 * @param params Parameters for the schema function
 * @returns JSON Schema representation
 */
export const getSchemaForAI = (schemaFunction: Function, params: any[] = []) => {
  try {
    const schema = typeof schemaFunction === 'function' 
      ? schemaFunction(...params) 
      : schemaFunction;
    
    // Convert to compatible JSON Schema
    return {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          devName: { type: 'string' },
          name: { type: 'string' },
          description: { type: 'string' },
          value: { type: 'string' },
          isDynamicValue: { type: ['boolean', 'null'], default: false },
          stateId: { type: 'string' },
          platform: { type: 'string', enum: ['android', 'ios'] },
          id: { type: ['string', 'null'] },
          xpath: {
            type: 'object',
            properties: {
              xpathExpression: { type: 'string' },
              numberOfMatches: { type: 'integer' },
              matchingNodes: { type: 'array', items: { type: 'string' } },
              isValid: { type: 'boolean' },
              success: { type: ['boolean', 'null'] },
            },
            required: ['xpathExpression', 'numberOfMatches', 'matchingNodes', 'isValid'],
          },
          xpathFix: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                priority: { type: 'integer', minimum: 0, maximum: 2 },
                xpath: { type: 'string', minLength: 1 },
                confidence: { type: 'string', enum: ['High', 'Medium', 'Low'] },
                description: { type: ['string', 'null'] },
                fix: { type: 'string' },
              },
              required: ['priority', 'xpath', 'confidence', 'fix'],
            },
            minItems: 1,
            maxItems: 3,
          },
        },
        required: ['devName', 'name', 'description', 'value', 'stateId', 'platform', 'xpath', 'xpathFix'],
        additionalProperties: false,
      },
      $schema: 'http://json-schema.org/draft-07/schema#',
    };
  } catch (error) {
    console.error('Error converting schema to JSON:', error);
    throw error;
  }
};