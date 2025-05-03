import swaggerJSDoc from 'swagger-jsdoc';
import { version } from '../../../package.json';

// Swagger definition
const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Appium AI Backend Service API',
    version,
    description: 'API documentation for the Appium AI Backend Service',
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT',
    },
    contact: {
      name: 'Support',
      email: 'support@example.com',
    },
  },
  servers: [
    {
      url: '/api',
      description: 'API server',
    },
  ],
  components: {
    securitySchemes: {
      ApiKeyAuth: {
        type: 'apiKey',
        in: 'header',
        name: 'x-api-key',
      },
    },
    schemas: {
      Element: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: 'Element ID',
          },
          devName: {
            type: 'string',
            description: 'Developer name for the element',
          },
          name: {
            type: 'string',
            description: 'Human-readable name for the element',
          },
          description: {
            type: 'string',
            description: 'Description of the element',
          },
          value: {
            type: 'string',
            description: 'Element text value',
          },
          isDynamicValue: {
            type: 'boolean',
            description: 'Flag indicating if the element value is dynamic',
          },
          stateId: {
            type: 'string',
            description: 'ID of the state this element belongs to',
          },
          platform: {
            type: 'string',
            description: 'Platform (ios, android)',
          },
        },
        required: ['devName', 'name', 'description', 'value', 'stateId'],
      },
      XPathInfo: {
        type: 'object',
        properties: {
          xpathExpression: {
            type: 'string',
            description: 'XPath expression',
          },
          numberOfMatches: {
            type: 'integer',
            description: 'Number of matches found with this XPath',
          },
          matchingNodes: {
            type: 'array',
            items: {
              type: 'string',
            },
            description: 'Matching nodes found with this XPath',
          },
          isValid: {
            type: 'boolean',
            description: 'Flag indicating if the XPath is valid',
          },
          success: {
            type: 'boolean',
            description: 'Flag indicating if the XPath was successfully evaluated',
          },
        },
        required: ['xpathExpression'],
      },
      ElementWithLocator: {
        allOf: [
          {
            $ref: '#/components/schemas/Element',
          },
          {
            type: 'object',
            properties: {
              xpath: {
                $ref: '#/components/schemas/XPathInfo',
              },
              alternativeXpaths: {
                type: 'array',
                items: {
                  $ref: '#/components/schemas/XPathInfo',
                },
              },
            },
            required: ['xpath'],
          },
        ],
      },
      StateVersion: {
        type: 'object',
        properties: {
          screenShot: {
            type: 'string',
            description: 'Base64 encoded screenshot',
          },
          pageSource: {
            type: 'string',
            description: 'XML page source',
          },
          deviceInfo: {
            type: 'object',
            properties: {
              platform: {
                type: 'string',
                description: 'Device platform (ios, android)',
              },
              platformVersion: {
                type: 'string',
                description: 'Platform version',
              },
              deviceName: {
                type: 'string',
                description: 'Device name',
              },
              udid: {
                type: 'string',
                description: 'Device UDID',
              },
            },
          },
        },
        required: ['screenShot', 'pageSource'],
      },
      State: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: 'State ID',
          },
          title: {
            type: 'string',
            description: 'State title',
          },
          description: {
            type: 'string',
            description: 'State description',
          },
          versions: {
            type: 'object',
            additionalProperties: {
              $ref: '#/components/schemas/StateVersion',
            },
            description: 'Platform-specific versions of this state',
          },
        },
        required: ['id', 'title', 'versions'],
      },
      Page: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: 'Page ID',
          },
          name: {
            type: 'string',
            description: 'Page name',
          },
          description: {
            type: 'string',
            description: 'Page description',
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
            description: 'Creation timestamp',
          },
          updatedAt: {
            type: 'string',
            format: 'date-time',
            description: 'Last update timestamp',
          },
          states: {
            type: 'array',
            items: {
              $ref: '#/components/schemas/State',
            },
            description: 'States associated with this page',
          },
          metadata: {
            type: 'object',
            description: 'Additional metadata',
          },
        },
        required: ['id', 'name', 'createdAt', 'states'],
      },
      AnalysisRequest: {
        type: 'object',
        properties: {
          page: {
            $ref: '#/components/schemas/Page',
          },
          osVersions: {
            type: 'array',
            items: {
              type: 'string',
              enum: ['ios', 'android'],
            },
            description: 'OS versions to analyze',
          },
        },
        required: ['page'],
      },
      ApiResponse: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            description: 'Indicates if the request was successful',
          },
          data: {
            type: 'object',
            description: 'Response data',
          },
          error: {
            type: 'object',
            properties: {
              message: {
                type: 'string',
                description: 'Error message',
              },
              code: {
                type: 'string',
                description: 'Error code',
              },
              details: {
                type: 'object',
                description: 'Additional error details',
              },
            },
            description: 'Error information',
          },
        },
        required: ['success'],
      },
      JobResponse: {
        type: 'object',
        properties: {
          jobId: {
            type: 'string',
            description: 'Job ID',
          },
          status: {
            type: 'string',
            enum: ['pending', 'processing', 'completed', 'failed'],
            description: 'Job status',
          },
          progress: {
            type: 'number',
            description: 'Job progress percentage',
            minimum: 0,
            maximum: 100,
          },
          result: {
            type: 'object',
            description: 'Job result (if completed)',
          },
          error: {
            type: 'object',
            properties: {
              message: {
                type: 'string',
                description: 'Error message',
              },
              code: {
                type: 'string',
                description: 'Error code',
              },
              details: {
                type: 'object',
                description: 'Additional error details',
              },
            },
            description: 'Job error (if failed)',
          },
        },
        required: ['jobId', 'status'],
      },
    },
  },
  security: [
    {
      ApiKeyAuth: [],
    },
  ],
};

// Options for the swagger docs
const options = {
  swaggerDefinition,
  // Paths to files containing OpenAPI definitions
  apis: ['./src/api/routes/*.ts'],
};

// Initialize swagger-jsdoc
export const specs = swaggerJSDoc(options);