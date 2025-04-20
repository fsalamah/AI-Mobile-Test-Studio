import { z } from "zod";

// export const VisualElementSchema = z.object({
//   isDynamicValue: z.boolean(),
//   devName: z.string(),
//   name: z.string(),
//   description: z.string(),
//   stateId: z.string(),
//   value: z.string()
// });

export const createOsSpecifVisualElementSchema = (possibleStateIds) => 
  z.array(z.object({
    isDynamicValue: z.boolean(),
    devName: z.string(),
    name: z.string(),
    description: z.string("a clear and concise description of the element that cannot be confused with other elements"),
    value: z.string(),
    state_ids: z.object({
      ios: z.string( z.enum(possibleStateIds)).describe("First iOS state ID as a string that has the element. If the current state is not iOS it will be empty"),
      android: z.string( z.enum(possibleStateIds)).describe("First Android state ID as a string that has the element. If the current state is not Android it will be empty"),
    })
  }));

// export const VisualPageAnalysisSchema = z.array(VisualElementSchema);
export const schemaVisualElementIdentification = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "array",
  "items": {
    "type": "object",
    "properties": {
      "isDynamicValue": {
        "type": "boolean"
      },
      "value": {
        "type": "string"
      },
      "devName": {
        "type": "string"
      },
      "name": {
        "type": "string"
      },
      "description": {
        "type": "string"
      },
      "state_ids": {
        "type": "object",
        "properties": {
          "android": {
            "type": "string"
          },
          "ios": {
            "type": "string"
          }
        },
        "required": ["android", "ios"]
      }
    },
    "required": ["isDynamicValue", "value", "devName", "name", "description", "state_ids"]
  }
}
//For locator generation
export const extractOsSimpleElements = (stateId, elements, os) => {
   elements.filter(element => element.state_ids[os] === stateId && element.state_ids[os] === os).map(element => {
    return {
      devName: element.devName,
      name: element.name,
      description: element.description,
      value: element.value,
      isDynamicValue: element.isDynamicValue,
      stateId: element.state_ids[os],
      xpathLocator:""
    };
     } )
}

// to be used after visually identifiying the elements as a result of METHOD groupElementsByStateAndOs
export const elementsByStateByOSJsonSchema = {
  "type": "array",
  "items": {
    "type": "object",
    "properties": {
      "state_id": {
        "type": "string",
        "description": "Unique identifier for the UI state"
      },
      "osVersion": {
        "type": "string",
        "enum": [
          "android",
          "ios"
        ],
        "description": "Operating system version"
      },
      "elements": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "isDynamicValue": {
              "type": "boolean",
              "description": "Indicates if the element's value is dynamic"
            },
            "devName": {
              "type": "string",
              "description": "Developer name or identifier for the element"
            },
            "value": {
              "type": "string",
              "description": "Current value of the element"
            },
            "name": {
              "type": "string",
              "description": "User-visible name of the element"
            },
            "description": {
              "type": "string",
              "description": "Detailed description of the element"
            }
          },
          "required": [
            "isDynamicValue",
            "devName",
            "value",
            "name",
            "description"
          ]
        },
        "description": "Array of UI elements present in the current state"
      },
      "screenshot": {
        "type": "string",
        "description": "Base64 encoded PNG image of the screenshot"
      },
      "pageSource": {
        "type": "string",
        "description": "XML source of the page"
      },
      "stateDescription": {
        "type": "string",
        "description": "Description of the UI state"
      },
      "stateTitle": {
        "type": "string",
        "description": "Title of the UI state"
      },
      "pageDescription": {
        "type": "string",
        "description": "Description of the page"
      },
      "pageTitle": {
        "type": "string",
        "description": "Title of the page"
      }
    },
    "required": [
      "state_id",
      "osVersion",
      "elements",
      "screenshot",
      "pageSource",
      "stateDescription",
      "stateTitle",
      "pageDescription",
      "pageTitle"
    ]
  }
}

// export const ElementWithXpathSchema = z.object({
//   devName: z.string(),
//   name: z.string(),
//   description: z.string(),
//   value: z.string(),
//   isDynamicValue: z.boolean(),
//   stateId: z.string(), // e.g., "state.ios"
//   xpathLocator: z.string().min(1)
// });

// export const ElementsResponseSchema = z.array(ElementWithXpathSchema);

export const createXpathLocatorSchema = (stateId) =>
  z.array(
    z.object({
      devName: z.string(),
      name: z.string(),
      description: z.string(),
      value: z.string(),
      isDynamicValue: z.boolean(),
      stateId: z.literal(`state.${stateId}`),
      xpathLocator: z.string().min(1, "xpathLocator must not be empty, if you failed to find an xpath locator, please this value //*[11=99]"),
    })
  );