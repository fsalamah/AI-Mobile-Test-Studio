import { z } from 'zod';

/**
 * Schema for visual element analysis
 * @param possibleStateIds Array of possible state IDs for validation
 * @returns Zod schema for visual elements
 */
export const createOsSpecifVisualElementSchema = (possibleStateIds: string[]) => {
  return z.array(
    z.object({
      devName: z.string().min(1, 'Developer name is required'),
      name: z.string().min(1, 'Name is required'),
      description: z.string().min(1, 'Description is required'),
      value: z.string(),
      isDynamicValue: z.boolean().nullable().default(false),
      stateId: z.enum(possibleStateIds),
    })
  );
};

/**
 * Convert schema to JSON Schema format for OpenAI
 * @param schema Zod schema to convert
 * @returns JSON Schema representation
 */
export const schemaToJsonSchema = (schema: z.ZodType<any, any, any>) => {
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
        stateId: { type: 'string', enum: [] }, // Will be filled dynamically
      },
      required: ['devName', 'name', 'description', 'value', 'stateId'],
    },
  };
};