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

  