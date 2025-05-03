import { z } from 'zod';

// Original schema for visual element analysis
export const createOsSpecifVisualElementSchema = (possibleStateIds) => {
  return z.array(
    z.object({
      devName: z.string(),
      name: z.string(),
      description: z.string(),
      value: z.string(),
      isDynamicValue: z.boolean().nullable().default(false),
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
      isDynamicValue: z.boolean().nullable().default(false),
      stateId: z.literal(`state.${stateId}`),
      xpathLocator: z.string().min(1, "xpathLocator must not be empty"),
    })
  );

// Schema for an individual XPath fix item
const xpathFixItemSchema = z.object({
  priority: z.number().int().min(0).max(2), 
  xpath: z.string().min(1),
  confidence: z.enum(["High", "Medium", "Low"]),
  description: z.string().nullable(),
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
      isDynamicValue: z.boolean().nullable().default(false),
      stateId: z.union([z.literal(`state.${stateId}`), z.literal(stateId)]),
      platform: z.enum(["android", "ios"]),
      id: z.string().nullable(),
      
      // Original failing XPath information
      xpath: z.object({
        xpathExpression: z.string(),
        numberOfMatches: z.number().int(),
        matchingNodes: z.array(z.string()),
        isValid: z.boolean(),
        success: z.boolean().nullable()
      }),
      
      // XPath fixes array
      xpathFix: z.array(xpathFixItemSchema)
        .min(1)
        .max(3)
    })
  );

// Helper function to convert schema to JSON Schema format for AI services
export const getSchemaForAI = (schemaFunction, params = []) => {
  try {
    const schema = typeof schemaFunction === 'function' 
      ? schemaFunction(...params) 
      : schemaFunction;
    
    // Convert to compatible JSON Schema
    return {
      type: "array",
      items: {
        type: "object",
        properties: {
          devName: { type: "string" },
          name: { type: "string" },
          description: { type: "string" },
          value: { type: "string" },
          isDynamicValue: { type: ["boolean", "null"], default: false },
          stateId: { type: "string" },
          platform: { type: "string", enum: ["android", "ios"] },
          id: { type: ["string", "null"] },
          xpath: {
            type: "object",
            properties: {
              xpathExpression: { type: "string" },
              numberOfMatches: { type: "integer" },
              matchingNodes: { type: "array", items: { type: "string" } },
              isValid: { type: "boolean" },
              success: { type: ["boolean", "null"] }
            },
            required: ["xpathExpression", "numberOfMatches", "matchingNodes", "isValid"]
          },
          xpathFix: {
            type: "array",
            items: {
              type: "object",
              properties: {
                priority: { type: "integer", minimum: 0, maximum: 2 },
                xpath: { type: "string", minLength: 1 },
                confidence: { type: "string", enum: ["High", "Medium", "Low"] },
                description: { type: ["string", "null"] },
                fix: { type: "string" }
              },
              required: ["priority", "xpath", "confidence", "fix"]
            },
            minItems: 1,
            maxItems: 3
          }
        },
        required: ["devName", "name", "description", "value", "stateId", "platform", "xpath", "xpathFix"],
        additionalProperties: false
      },
      $schema: "http://json-schema.org/draft-07/schema#"
    };
  } catch (error) {
    console.error("Error converting schema to JSON:", error);
    throw error;
  }
};

// For OpenAI structured output compatibility
export const getOpenAIResponseFormat = (schemaFunction, params = []) => {
  return {
    type: "json_object",
    schema: getSchemaForAI(schemaFunction, params)
  };
};

// For Gemini compatibility
export const getGeminiSchema = (schemaFunction, params = [], schemaName = "Response") => {
  return {
    name: schemaName,
    schema: getSchemaForAI(schemaFunction, params)
  };
};