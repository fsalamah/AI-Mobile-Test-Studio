import { z } from 'zod';

/**
 * Schema for XPath locator generation
 * @param stateId State ID for validation
 * @returns Zod schema for XPath locators
 */
export const createXpathLocatorSchema = (stateId: string) =>
  z.array(
    z.object({
      devName: z.string().min(1, 'Developer name is required'),
      name: z.string().min(1, 'Name is required'),
      description: z.string().min(1, 'Description is required'),
      value: z.string(),
      isDynamicValue: z.boolean().nullable().default(false),
      stateId: z.literal(`state.${stateId}`),
      xpathLocator: z.string().min(1, 'XPath locator must not be empty'),
    })
  );

/**
 * Convert schema to JSON Schema format for OpenAI
 * @param schema Zod schema to convert
 * @param stateId State ID for validation
 * @returns JSON Schema representation
 */
export const xpathSchemaToJsonSchema = (schema: z.ZodType<any, any, any>, stateId: string) => {
  // This is a simplified conversion - in a real app, you'd use a library
  // that properly converts Zod schemas to JSON Schema
  return {
    type: 'array',
    items: {
      type: 'object',
      properties: {
        devName: { type: 'string', minLength: 1 },
        name: { type: 'string', minLength: 1 },
        description: { type: 'string', minLength: 1 },
        value: { type: 'string' },
        isDynamicValue: { type: ['boolean', 'null'], default: false },
        stateId: { type: 'string', enum: [`state.${stateId}`] },
        xpathLocator: { type: 'string', minLength: 1 },
      },
      required: ['devName', 'name', 'description', 'value', 'stateId', 'xpathLocator'],
    },
  };
};