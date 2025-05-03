import { Page, Element, State } from '../../types/api.js';
import { Logger } from '../../utils/logger.js';
import { XmlUtils } from '../utils/xml-utils.js';

/**
 * Builder for AI prompts
 */
export class PromptBuilder {
  /**
   * Generate a prompt for analyzing states
   * @param page Page object with states
   * @param generationConfig Generation configuration
   * @param os Target OS platform
   * @returns Prompt message for AI
   */
  static async generateStatesPrompt(
    page: Page,
    generationConfig: any,
    os: string
  ): Promise<any> {
    try {
      // Find states with the specified OS version
      const states = page.states.filter((state) => {
        return state.versions && state.versions[os];
      });

      if (states.length === 0) {
        throw new Error(`No states found for OS: ${os}`);
      }

      // Create state data for each state
      const stateData = states.map((state) => {
        const versionData = state.versions[os];
        
        // Try to reduce XML size if too large (>500KB)
        let pageSource = versionData.pageSource;
        if (pageSource && pageSource.length > 500000) {
          Logger.info(`Simplifying large XML source for state ${state.id} (${pageSource.length} bytes)`);
          pageSource = XmlUtils.simplifyXml(pageSource, 10);
        }
        
        return {
          id: state.id,
          title: state.title || '',
          description: state.description || '',
          screenshot: versionData.screenShot,
          xmlSource: pageSource,
          os,
        };
      });

      // Create system prompt
      const systemPrompt = {
        role: 'system',
        content: `
You are an expert in analyzing mobile app interfaces and preparing data for test automation using Appium.
I'll show you one or more screenshots with XML source. Identify the UI elements that should be part of a Page Object Model.

Identify all interactive and significant elements:
- Buttons, text fields, labels with important info, tabs, images that could be clicked, etc.
- Elements a tester would need to interact with or verify
- Elements that represent important app state or data

Format the response as a list of objects with these properties:
- "devName": a camelCase ID usable in code as a variable name ("loginButton", "usernameField", "errorMessage").
- "name": a human-readable name ("Login Button", "Username Field").
- "description": a brief description of what this element is or does.
- "value": text content shown in the element, if any. If not visible, leave as empty string.
- "isDynamicValue": set to true if the value is likely to change (e.g., order numbers, prices, timestamps).
- "stateId": Which app state this element belongs to. Must be one of these: ${states.map((s) => s.id).join(', ')}

Key guidelines:
- Identify 10-30 important elements, focusing on interactive elements
- Ensure each devName is unique
- Don't include every tiny element, focus on what's important for testing
- Don't include layout containers unless they're important for testing
- Pay attention to the XML structure to understand the hierarchy

Target OS: ${os.toUpperCase()}
Application: ${page.name}
Description: ${page.description || 'No description provided'}
`,
      };

      // Create content prompt with state data
      const contentPrompt = {
        role: 'user',
        content: `Here are the app states to analyze. For each state, I'm providing a screenshot (base64 encoded) and the XML source:

${stateData.map((state, index) => `
***** STATE ${index + 1} *****
ID: ${state.id}
Title: ${state.title}
Description: ${state.description}
OS: ${state.os}

SCREENSHOT:
${state.screenshot}

XML SOURCE:
${state.xmlSource}
`).join('\n\n')}

Analyze these states and identify the important UI elements as described. Provide your response in the specified JSON format.
`,
      };

      return contentPrompt;
    } catch (error) {
      Logger.error('Error generating states prompt:', error);
      throw error;
    }
  }

  /**
   * Create a prompt for validating elements
   * @param originalPrompt Original prompt
   * @param elementsJson JSON string of elements
   * @param os Target OS platform
   * @returns Validation prompt for AI
   */
  static createValidationPrompt(
    originalPrompt: any,
    elementsJson: string,
    os: string
  ): any {
    return {
      role: 'user',
      content: `${originalPrompt.content}

I've identified some elements, but I'd like you to verify and improve this list.
Here are the elements I've found:

${elementsJson}

Please review these elements and make the following improvements:
1. Fix any incorrect stateId values
2. Make sure all devNames are unique and appropriate
3. Add any important elements I might have missed
4. Remove any elements that don't seem useful for testing
5. Fix any descriptions that aren't accurate
6. Ensure all properties have appropriate values

Remember, we're targeting ${os.toUpperCase()} platform.
`,
    };
  }

  /**
   * Create a prompt for generating XPath locators
   * @param params Parameters for the prompt
   * @returns XPath generation prompt for AI
   */
  static createXpathOnlyPrompt(params: {
    screenshotBase64: string;
    xmlText: string;
    elements: Element[];
    os: string;
    genConfig: any;
  }): any {
    const { screenshotBase64, xmlText, elements, os, genConfig } = params;

    // Create system prompt
    const systemPrompt = `
You are an expert in mobile test automation, specialized in creating reliable XPath locators for ${os.toUpperCase()} apps.
I'll provide a screenshot, XML source, and a list of elements. Your task is to generate the best possible XPath locator for each element.

For ${os.toUpperCase()}, here are the best practices for XPath locators:
- Prefer attributes like resource-id, content-desc, text for Android
- Prefer attributes like name, label, value, type for iOS
- Use position only when necessary and with stable parent references
- Avoid using index whenever possible
- For text elements, use text() or contains() functions
- Create XPaths that are unique but robust to minor UI changes

The XML structure provided is from an Appium session.
`;

    // Create user prompt with element data
    const userPrompt = `
SCREENSHOT:
${screenshotBase64}

XML SOURCE:
${xmlText}

ELEMENTS TO LOCATE:
${JSON.stringify(elements, null, 2)}

For each element, add an "xpathLocator" property with a robust XPath that uniquely identifies this element.
Return the complete array with all the original properties plus the new xpathLocator property.
Ensure each XPath is as reliable as possible, following the best practices for ${os.toUpperCase()}.
`;

    return {
      role: 'user',
      content: userPrompt,
    };
  }

  /**
   * Create a prompt for mapping elements to different OS versions
   * @param elements Elements to map
   * @param page Page object
   * @param targetOs Target OS platform
   * @returns State ID mapping prompt for AI
   */
  static createOtherOsStateIdPrompt(
    elements: Element[],
    page: Page,
    targetOs: string
  ): any {
    try {
      // Find states with the target OS version
      const states = page.states.filter((state) => {
        return state.versions && state.versions[targetOs];
      });

      if (states.length === 0) {
        throw new Error(`No states found for OS: ${targetOs}`);
      }

      // Create state data for the target OS
      const stateData = states.map((state) => {
        const versionData = state.versions[targetOs];
        
        return {
          id: state.id,
          title: state.title || '',
          description: state.description || '',
          screenshot: versionData.screenShot,
          xmlSource: versionData.pageSource,
        };
      });

      // Create system prompt
      const systemPrompt = `
You are an expert in cross-platform mobile app testing. I'll show you a list of UI elements identified on one platform,
and screenshots + XML source from another platform (${targetOs.toUpperCase()}).

Your task is to map each element to its corresponding state ID in the ${targetOs.toUpperCase()} version.
The elements should be returned with the same properties, but with stateIds mapped to the corresponding ${targetOs.toUpperCase()} states.

The possible state IDs for ${targetOs.toUpperCase()} are: ${states.map((s) => s.id).join(', ')}
`;

      // Create user prompt with element and state data
      const userPrompt = `
Here are the elements from another platform:
${JSON.stringify(elements, null, 2)}

Here are the states for ${targetOs.toUpperCase()}:

${stateData.map((state, index) => `
***** STATE ${index + 1} *****
ID: ${state.id}
Title: ${state.title}
Description: ${state.description}

SCREENSHOT:
${state.screenshot}

XML SOURCE:
${state.xmlSource}
`).join('\n\n')}

For each element, determine which state it belongs to in the ${targetOs.toUpperCase()} version.
Return the complete array with all the original properties, but update the stateId to match the correct ${targetOs.toUpperCase()} state.
If an element doesn't exist in ${targetOs.toUpperCase()}, you can omit it from the result.
`;

      return {
        role: 'user',
        content: userPrompt,
      };
    } catch (error) {
      Logger.error(`Error creating OS state ID prompt for ${targetOs}:`, error);
      throw error;
    }
  }

  /**
   * Create a prompt for XPath repair
   * @param params Parameters for the prompt
   * @returns XPath repair prompt for AI
   */
  static buildXPathRepairPrompt(params: {
    screenshotBase64: string;
    xmlText: string;
    failingElements: Element[];
    platform: string;
  }): any[] {
    const { screenshotBase64, xmlText, failingElements, platform } = params;

    // Create system message
    const systemMessage = {
      role: 'system',
      content: `
You are an expert in mobile test automation, specializing in fixing broken XPath expressions for ${platform.toUpperCase()} apps.
I'll provide a screenshot, XML source, and a list of elements with failing XPaths. Your task is to repair these XPaths to make them work.

For ${platform.toUpperCase()}, here are the best practices for robust XPath locators:
${platform === 'android' ? `
- Use @resource-id when available (most reliable)
- Use @content-desc for accessibility text
- Use @text for visible text
- Combine attributes for greater reliability
- Use parent-child relationships when needed
- Avoid using index when possible
` : `
- Use @name attribute when available (most reliable)
- Use @label for visible labels
- Use @value for input fields
- Use @type for element type
- Combine attributes for greater reliability
- Use parent-child relationships when needed
- Avoid using index when possible
`}

For each failing XPath:
1. Analyze why it's failing
2. Create 1-3 alternative XPaths with different approaches
3. Rank them by reliability (priority 0 = best)
4. Describe your fix strategy
`,
    };

    // Create user message with element data
    const userMessage = {
      role: 'user',
      content: `
SCREENSHOT:
${screenshotBase64}

XML SOURCE:
${xmlText}

FAILING ELEMENTS AND XPATHS:
${JSON.stringify(failingElements, null, 2)}

For each element, provide alternative XPath expressions that will work reliably.
Return each element with all its original properties, plus an "xpathFix" array containing 1-3 alternative XPaths.

Each xpathFix item should have:
- "priority": Integer 0-2 (0 = primary/best solution, 1-2 = alternatives)
- "xpath": The fixed XPath expression
- "confidence": "High", "Medium", or "Low"
- "description": Brief explanation of the approach (optional)
- "fix": What was changed from the original

Focus on creating XPaths that are:
1. Unique (match exactly one element)
2. Robust (won't break with minor UI changes)
3. Readable (can be understood by humans)
`,
    };

    // Return messages array
    return [systemMessage, userMessage];
  }

  /**
   * Create a prompt for POM generation
   * @param page Page object with elements and locators
   * @param language Target programming language
   * @param framework Target testing framework
   * @returns POM generation prompt for AI
   */
  static createPOMGenerationPrompt(
    page: Page,
    language: string,
    framework: string
  ): any[] {
    // Create system message
    const systemMessage = {
      role: 'system',
      content: `
You are an expert test automation developer specialized in creating Page Object Models for mobile apps.
I'll provide page information and element details. Your task is to generate a complete, production-ready POM class in ${language} using ${framework}.

Follow these best practices:
- Create a well-structured class with proper encapsulation
- Implement methods for all important interactions
- Include appropriate error handling and logging
- Follow standard naming conventions for ${language}
- Make the code readable and maintainable
- Include proper comments and documentation
- Implement proper waits and synchronization
`,
    };

    // Create user message with page and element data
    const userMessage = {
      role: 'user',
      content: `
PAGE INFORMATION:
Name: ${page.name}
Description: ${page.description || 'No description provided'}

ELEMENTS:
${JSON.stringify(page.states, null, 2)}

Please generate a complete Page Object Model class for this page in ${language} using the ${framework} framework.
Include all necessary imports, class definition, element locators, and interaction methods.
Make the code production-ready with proper error handling, comments, and best practices.

For ${language} with ${framework}, follow these specific conventions:
${getLanguageSpecificGuidelines(language, framework)}
`,
    };

    // Return messages array
    return [systemMessage, userMessage];
  }
}

/**
 * Get language-specific guidelines for POM generation
 * @param language Target programming language
 * @param framework Target testing framework
 * @returns Guidelines string
 */
function getLanguageSpecificGuidelines(language: string, framework: string): string {
  // Default guidelines
  let guidelines = '';
  
  // Language-specific guidelines
  switch (language.toLowerCase()) {
    case 'java':
      guidelines = `
- Use proper Java naming conventions (camelCase for methods/variables, PascalCase for classes)
- Implement private fields with public getter methods
- Use annotations like @FindBy when appropriate
- Implement proper exception handling with try-catch
- Return 'this' from interaction methods for method chaining
- Include JavaDoc comments for public methods`;
      break;
      
    case 'javascript':
    case 'typescript':
      guidelines = `
- Use modern JS/TS syntax with async/await
- Implement proper error handling with try/catch
- Use camelCase for methods and variables
- Include JSDoc comments for methods
- Use arrow functions when appropriate
- Implement page object methods that return promises`;
      break;
      
    case 'python':
      guidelines = `
- Follow PEP 8 style guidelines
- Use snake_case for methods and variables
- Implement proper docstrings for classes and methods
- Use proper exception handling with try/except
- Make good use of Python's language features
- Implement explicit waits with appropriate timeouts`;
      break;
      
    case 'csharp':
      guidelines = `
- Follow C# naming conventions (PascalCase for public members)
- Implement proper exception handling with try/catch
- Use properties instead of public fields
- Include XML documentation comments
- Make use of nullable types where appropriate
- Implement fluent interfaces for method chaining`;
      break;
      
    default:
      guidelines = `
- Follow standard naming conventions for ${language}
- Implement proper error handling
- Include appropriate documentation comments
- Use explicit waits for element interactions
- Make the code readable and maintainable`;
  }
  
  // Framework-specific additions
  switch (framework.toLowerCase()) {
    case 'appium':
      guidelines += `\n- Use AppiumBy for locator strategies
- Implement proper waits for mobile elements
- Handle both Android and iOS platforms
- Use touchActions for complex gestures`;
      break;
      
    case 'selenium':
      guidelines += `\n- Use By class for locators
- Implement proper WebDriverWait for synchronization
- Handle browser compatibility issues
- Implement scrolling and navigation methods`;
      break;
      
    case 'wdio':
      guidelines += `\n- Use WebdriverIO selectors
- Make good use of WDIO's built-in waits
- Implement custom commands when needed
- Use WDIO's assertion library`;
      break;
  }
  
  return guidelines;
}