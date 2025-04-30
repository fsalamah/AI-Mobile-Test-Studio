export class PromptBuilder {
  static createXpathOnlyPrompt({ screenshotBase64, xmlText, elements, os, generationConfig }) {
    const systemInstruction=`# Mobile UI XPath Generator: Expert Precision System

You are a specialized mobile UI analyzer with advanced XPath 1.0 expertise. Your task is to enhance UI element data with production-grade XPath locators that are resilient to UI changes.

## Input Processing
- Analyze both screenshot and XML source to understand visual and structural context
- Each node has either bounds or x,y,width,height, utilize these to understand the node location visually, but never use them in xpath.
- Process each element individually while considering its relationship to surrounding elements
- Preserve all original properties ('devName', 'name', 'description', 'value', 'isDynamicValue', 'stateId') unchanged
- Add only one new property: 'xpathLocator' with a unique, robust XPath expression

## Core Locator Strategy (Prioritized)

### 1️⃣ RESULT-LEVEL INDEXING (Highest Priority)
- **ALWAYS** wrap XPath expressions before applying index modifiers:
  - ✅ '(//your-xpath)[1]' - First match
  - ✅ '(//your-xpath)[last()]' - Last match
  - ✅ '(//your-xpath)[index]' - Specific index
  - ✅ '(//your-xpath-part)[n]/second-part' - Chained path with indexing

- **NEVER** use path-level indexing patterns:
  - ❌ '//your-xpath[1]' - INVALID
  - ❌ '//your-xpath[last()]' - INVALID
  - ❌ '//your-xpath-part[1]/second-part' - INVALID

### 2️⃣ CONTEXTUAL ANCHOR SYSTEM (High Priority)
- When an element attribute is likely to change during runtime, locate elements using their **relationship to stable elements**:
  - Identify stable contextual anchors (labels, headings, container elements)
  - Use visual proximity and XML structure to establish relationships
  - Apply axis operators to navigate from anchors to target elements

- **Element types requiring contextual anchoring:**
  - Input fields (EditText, TextField)
  - Dynamic content displays (balances, counts, personalized info)
  - Variable state indicators (status messages, toggles)

### 3️⃣ USER INPUT FIELDS (Critical)
- **NEVER** use editable content in XPath expressions:
  - ❌ Do not match on '@text', '@value', or '@hint' attributes
  
- **Contextual anchor technique:**
  1. Find nearby static label/text element
  2. Use axis operators to navigate from label to input
  3. Apply result-level indexing for precision
  
  ✅ Example:
  '''
  (//android.widget.TextView[contains(@text, 'Email')]/following::android.widget.EditText)[1]
  '''

- **Fallback strategy** if no label exists:
  - Use static sibling or container element as anchor
  - Navigate using axis operators with result-level indexing

### 4️⃣ DYNAMIC TEXT HANDLING (High Priority)
- **Never** anchor on dynamic content:
  - User-specific information
  - Time-based data
  - Session-specific values
  - Calculated amounts

- **Always** use surrounding static context with:
  - 'preceding::' or 'following::' to navigate from stable elements
  - Result-level indexing for precision

### 5️⃣ AXIS SELECTION FRAMEWORK (Medium Priority)
- **Preferred axis operators** (resilient to layout changes):
  - 'following::'
  - 'preceding::'
  - 'ancestor::'
  - 'descendant::'

- **Forbidden axis operators** (brittle to layout changes):
  - ❌ NEVER USE 'following-sibling'
  - ❌ NEVER USE 'preceding-sibling'
  
### 6️⃣ ATTRIBUTE SELECTION (Medium Priority)
- **Strong attributes** (prefer these):
  - Resource IDs ('@resource-id', '@id')
  - Accessibility identifiers ('@content-desc', '@name')
  - Element type/class ('@class')

- **Weak attributes** (avoid when possible):
  - Text content ('@text') - unless guaranteed static
  - Visual properties (size, position)
  - Generic indexes

## Special Case Handling

### Non-Locatable Elements
If element cannot be reliably located with XPath:
- Use fallback locator: '//*[99=0]'

### List Items & Repeating Elements
- Use structural patterns and content-agnostic selectors
- Prefer container attributes over content attributes
- Apply consistent indexing strategy for similar elements

### Complex UI Patterns
- For tabbed interfaces, modals, or nested structures:
  - Analyze parent-child relationships
  - Ensure XPath works across UI state changes
  - Consider element visibility contexts

## Output Requirements
- Return JSON array with all original elements
- Add only one new property: 'xpathLocator' with unique XPath string
- Ensure each XPath is unique and robust
- Preserve all original properties unchanged
***IMPORTANT*** Always stick to the simplest and shortest possible xpath unless it is a special case.
***VERY IMPORTANT***: The xpathLocator must be unique for each element.
***VERY IMPORTANT***: Do not touch any other property of the elements, do not add or remove any other property.

Current Platform: '${os.toUpperCase()}'

RESPOND ONLY IN JSON AND IN THIS FORMAT:
`.trim(); 
    return [{
      role: "user",
      content: [
        {
          type: "text",
          text: systemInstruction,
        },
        {
          type: "text",
          text: "if you failed to find a suitable xpath for any element, please use the following placeholder: '//*[99=0]'",
        },
        {
          type: "image_url",
          image_url: {
            url: `data:image/png;base64,${screenshotBase64}`,
          },
        },
        {
          type: "text",
          text: `🧾 XML Page Source:\n\n${xmlText}`,
        },
        {
          type: "text",
          text: `📦 Elements (DO NOT modify, just add xpathLocator):\n\n${JSON.stringify(elements, null, 2)} \n Pay special attention to elements that may have placeholders and try to get them by their heirarical their static, since placeholders could change once the user sets a value`,
        },
      ],
      generationConfig:generationConfig
    }];
  }
  
  static async generateStatesPrompt(page, generationConfig, os) {
    const baseInstruction = `UI Element Detection from Overlapping Screenshots
You are a professional software test engineer. Your job is to analyze overlapping mobile screenshots and return a structured, deduplicated list of all visible UI elements and text strings.

🔁 Full Procedure: Execute These 7 Steps in Order
1. 🛠️ PREPARE ENVIRONMENT
Ignore system/status bars (clock, signal, battery).

Device OS version: ${os}

Images may represent overlapping UI states.

Target: ~50 meaningful elements per screen, but estimate dynamically.

Output must be a flat JSON array only, no explanations.

2. 📊 SCREEN COMPLEXITY ASSESSMENT
Estimate screen complexity to guide element expectations:

Count total visible strings on the screen.

Number of elements must always be ≥ number of strings.

Use this to validate completeness and detect missed controls, containers, or visual structures.

3. 🔍 OBJECT DETECTION
Detect all visible UI objects and strings, even if overlapping:

For each object, extract:

{
  "type": "<elementType>",
  "bounds": [x, y, width, height],
  "value": "<visibleText>",       // optional
  "dynamic": true | false,        // if the text looks runtime-generated
  "devName": "<generatedName>"
}
Text handling:

Normalize visible text: trim, Unicode NFC, lowercase, remove invisible characters.

Detect dynamic patterns (e.g. prices, dates, counts) → set "dynamic": true.

4. 🧠 TYPE CLASSIFICATION
Assign "type" using the following rules:

Use allowed values from the official list (see Step 6).

If the type is unclear, use:

"other" for ambiguous elements

"swipeArea" for swipeable or scrollable containers (e.g., carousels, list views)

Apply contextual rules:

Actionable = button

Nearby static label = label

Decorative = icon

Repeating block = listItem or card

5. 🔁 CROSS-IMAGE DEDUPLICATION
Screenshots may overlap. Avoid duplicates using this deduplication key:

fingerprint = type + bounds (rounded to nearest 5px) + normalized value
Track each object across images.

Only keep the first occurrence of each unique object.

6. 🏷️ DEVNAME GENERATION
Assign a unique "devName" using this format:
"<type><ClearName>" in camelCase

<type> is the element type

<ClearName> is a concise, readable name from context (e.g., submitButton, usernameField)

If two elements would get the same name, keep only the first

Avoid ordinal suffixes (e.g., button1, button2)

7. ✅ OUTPUT VALIDATION
Before output, self-check:

Number of elements ≥ number of strings

All devNames are unique

All bounds are valid and on-screen

All "value" strings are clean and complete

No repeated or overlapping entries

8. 🧱 ALLOWED ELEMENT TYPES
Only use values from this list (plus swipeArea and other if needed):

button, textField, passwordField, checkbox, radioButton, dropdown, dropdownBody,
spinner, switch, toggle, slider, stepper, label, text, link, image, icon, modal,
dialog, toast, tab, tabBar, menu, menuItem, accordion, list, listItem, table,
tableRow, tableCell, grid, gridItem, card, carousel, progressBar, activityIndicator,
searchBar, datePicker, timePicker, dateTimePicker, scrollView, video, canvas, map,
tooltip, floatingButton, form, formField, avatar, badge, breadcrumb, codeBlock,
divider, navbar, pagination, overlay, drawer, expansionPanel, toolbar, appBar, contextMenu,
**swipeArea**, **other**
📤 FINAL OUTPUT FORMAT
Return a flat array of JSON
⚠️ Only return the array. No comments, metadata, or extra text.
`;

    const content = [{ type: "text", text: baseInstruction }];

    for (const state of page.states) {
      // Log available OS versions for this state
      const availableVersions = Object.keys(state.versions || {});
      
      // Check if the requested OS exists in the available versions
      if (state.versions && state.versions[os] && state.versions[os].screenShot) {
        // Use the requested OS version
        content.push(
          {
            type: "text",
            text: `Page: ${page.name}, State Name: ${state.title}, State ID: ${state.id}, Description: ${state.description}`,
          },
          {
            type: "image_url",
            image_url: {
              url: `data:image/jpeg;base64,${state.versions[os].screenShot}`,
            },
          }
        );
      } else {
        // If requested OS isn't available, use the first available OS version
        if (availableVersions.length > 0) {
          const fallbackOs = availableVersions[0];
          console.log(`OS ${os} not found for state ${state.id}. Available versions: ${availableVersions.join(', ')}. Using ${fallbackOs} instead.`);
          
          content.push(
            {
              type: "text",
              text: `Page: ${page.name}, State Name: ${state.title}, State ID: ${state.id}, Description: ${state.description} (Requested OS: ${os} not available, using ${fallbackOs} instead)`,
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${state.versions[fallbackOs].screenShot}`,
              },
            }
          );
        } else {
          // No versions available at all
          console.log(`No OS versions available for state ${state.id}.`);
          content.push({
            type: "text",
            text: `Page: ${page.name}, State Name: ${state.title}, State ID: ${state.id}, Description: ${state.description} (No OS versions available)`,
          });
        }
      }
    }

    return {
      role: "user",
      content,
      generationConfig,
    };
  }

  static createValidationPrompt(initialPrompt, firstResponseContent, os) {
    return {
      ...initialPrompt,
      content: [
        {
          type: "text",
          text: `
            Validate and enhance the analysis.
            Ensure all elements and strings are captured, handling overlaps and repetitions.
            Add or update any missing items based on:
            ${firstResponseContent}

            Validation rules:
            1. At least as many elements as strings per page.
            2. devName should be unique and in camelCase.
            3. Correct stateId assignment as the following (state.<os_version_name>:String ).
            4. Clear, concise description.
            5. Accurate value field for any text-bearing element.
            6. Only retain the first instance of any duplicated devName.
            **IMPORTANT** OS VERSION FOR THIS PROMPT: ${os}
          `.trim(),
        },
        ...initialPrompt.content.slice(1),
      ],
    };
  }

  static createOtherOsStateIdPrompt(deduplicatedElements, page, targetOS) {
    const baseInstruction = `
      You are a software test engineer. Assign the correct stateId for each element in the provided list based on the screenshots of the target OS (${targetOS}).
      Use the following rules:
      - Match elements to the state screenshot of the target OS.
      - Ensure the stateId corresponds to the correct state in the target OS.
      - If an element cannot be matched, mark its stateId as "unknown".
      - Retain all other properties of the elements.
    `.trim();
    
    const content = [{ type: "text", text: baseInstruction }];

    for (const state of page.states) {
      // Check if the target OS version is available
      if (state.versions && state.versions[targetOS] && state.versions[targetOS].screenShot) {
        content.push(
          {
            type: "text",
            text: `State Name: ${state.title}, State ID: ${state.id}, Description: ${state.description}`,
          },
          {
            type: "image_url",
            image_url: {
              url: `data:image/jpeg;base64,${state.versions[targetOS].screenShot}`,
            },
          }
        );
      } else {
        // Log available versions
        const availableVersions = Object.keys(state.versions || {});
        console.log(`Target OS ${targetOS} not found for state ${state.id}. Available versions: ${availableVersions.join(', ')}`);
        
        // Use the first available version if any
        if (availableVersions.length > 0) {
          const fallbackOs = availableVersions[0];
          content.push(
            {
              type: "text",
              text: `State Name: ${state.title}, State ID: ${state.id}, Description: ${state.description} (Target OS: ${targetOS} not available, using ${fallbackOs} instead)`,
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${state.versions[fallbackOs].screenShot}`,
              },
            }
          );
        } else {
          content.push({
            type: "text",
            text: `State Name: ${state.title}, State ID: ${state.id}, Description: ${state.description} (No OS versions available)`,
          });
        }
      }
    }

    content.push({
      type: "text",
      text: `Deduplicated Elements: ${JSON.stringify(deduplicatedElements, null, 2)}`,
    });

    return {
      role: "user",
      content,
    };
  }

  static createTextExtractionPrompt(screenshots) {
    const baseInstruction = `
      You are an expert in understanding user interfaces.
      Given an input image of a UI screen, extract only the visible text that a user can see on the screen.
  
      Instructions:
      - Return a flat array of strings, where each string is one distinct piece of visible text (such as labels, buttons, input placeholders, headings, etc.).
      - Ignore dynamic values, such as user names, passwords, or any other text that may change based on user input or context.
      - Do not include bounding boxes, coordinates, or layout information.
      - Do not include repeated text unless it is actually duplicated on screen.
      - The order of strings can follow general visual reading order (top-to-bottom, left-to-right), but perfect ordering is not required.
  
      Output format (JSON):
      [string1, string2, string3, ...]
      
    `.trim();
  
    const content = [{ type: "text", text: baseInstruction }];
  
    for (const screenshot of screenshots) {
      content.push({
        type: "image_url",
        image_url: {
          url: `data:image/jpeg;base64,${screenshot}`,
        },
      });
    }
  
    return {
      role: "user",
      content,
    };
  }

  /**
   * Creates prompts for generating Page Object Model classes
   * @param {string} pageBaseClass - The base class name that the POM should extend
   * @param {boolean} hasPageBase - Whether a PageBase implementation is provided
   * @param {string} pageMetadataBase64 - Base64 encoded page metadata
   * @param {string} screenshotsInfoBase64 - Base64 encoded screenshots info
   * @param {string} guideTextBase64 - Base64 encoded guide text
   * @param {string} uniqueLocatorsList - Base64 encoded locators JSON
   * @param {string|null} pageBaseBase64 - Optional Base64 encoded PageBase implementation
   * @param {Array} screenshots - Array of screenshot objects with platform and base64 data
   * @returns {Array} - Messages array for the AI service
   */
  static createPOMGenerationPrompt(
    pageBaseClass,
    hasPageBase,
    pageMetadataBase64,
    screenshotsInfoBase64,
    guideTextBase64,
    uniqueLocatorsList,
    pageBaseBase64,
    screenshots
  ) {
    // Adjust system prompt based on whether PageBase is provided
    let systemPrompt = `# Prompt for Creating a Standardized Page Object Model Class

## Task Definition
Create a complete, executable Page Object Model (POM) class in Groovy for a [SPECIFIC_PAGE_NAME] page in the [SPECIFIC_MODULE_NAME] module. Follow ONLY the guidelines and patterns outlined below.

## IMPORTANT CONSTRAINTS
1. DO NOT add any methods, imports, or functionality that are not explicitly requested
2. DO NOT use any naming patterns that differ from those provided in this prompt
3. DO NOT create placeholder or TODO comments - all code must be complete
4. DO NOT reference any frameworks, libraries, or methods that aren't in the import statements
5. DO NOT add any creative embellishments to the implementation

## POM Class Structure Requirements

### Class Header & Package Definition
groovy
package [EXACT_MODULE_PACKAGE_PATH]
import com.kms.katalon.core.testobject.TestObject
import com.kms.katalon.core.util.KeywordUtil
import com.acabes.framework.PageBase


### Class Naming & Declaration
groovy
public class [EXACT_PAGE_NAME]Page extends PageBase {
    // Implementation will go here
}


## Class Content Sections
Implement the following sections in exact order:

### 1. Page Strings (Required)
groovy
// SECTION 1: PAGE STRINGS
// Format: getString[ControlName][ControlType][Label/Title/PlaceHolder/Text]()
public static String getStringLoginButtonLabel() {
    return GetLangString("Log in", "تسجيل الدخول")
}
// Add all required string methods


### 2. Page Locators
groovy
// SECTION 2: PAGE LOCATORS
// Format: get[ControlType][ControlName]()
public static TestObject getButtonLogin() {
    return findTestObject()
}
// Add all required locator methods


### 3. Page Methods
groovy
// SECTION 3: PAGE METHODS
// A. Object Interaction Methods - Required
// Format for interaction methods: [action][ObjectName]
public static void clickLoginButton() {
    logInfo("Clicking Login Button")
    Mobile.tap(getButtonLogin(), 0)
}

// B. Verification Methods - Required
// Format: verify[Object/Group/PageContent/Condition]
public static void verifyLoginPageContent() {
    logInfo("Verifying Login Page Content")
    Mobile.verifyElementExist(getButtonLogin(), 0)
    Mobile.verifyElementExist(getInputUsername(), 0)
    Mobile.verifyElementExist(getInputPassword(), 0)
    
    // Verify text elements
    Mobile.verifyElementText(getLabelLoginTitle(), getStringLoginTitleText())
    // Add other verification steps as needed
}

// C. Perform Methods - Required
// Format for perform methods: perform[PageName]Page
public static void perform[PageName]Page(
    String param1, 
    String param2,
    boolean isSubmit = true
) {
    // Implementation with null checks for parameters
    if (param1 != null) {
        // Use interaction method
    }
    
    if (param2 != null) {
        // Use interaction method
    }
    
    if (isSubmit) {
        // Click submit/next button
    }
}

// D. Navigation Methods - Optional
// Format: navigateTo[DestinationPage]
public static void navigateToHomePage() {
    logInfo("Navigating to Home Page")
    // Implementation of navigation steps
}


## Output Instructions

1. Based on the input provided, create a COMPLETE Page Object Model class following the exact structure:
   - Section 1: Page Strings
   - Section 2: Page Locators
   - Section 3: Page Methods (with clear subsections)
   - Section 4: Verificatiion Section

2. For each UI element provided:
   - Create exactly ONE string method (if it has text)
   - Create exactly ONE locator method
   - Create appropriate interaction methods based on the element type:
     - For buttons: create a click method
     - For inputs: create a setText method
     - For checkboxes: create a check/uncheck method
     - For dropdowns: create a select method

3. Create EXACTLY the verification methods specified in the input.

4. Create ONE perform page method that accepts parameters for ALL UI element interactions.

5. Create navigation methods ONLY if specified in the input.

6. Create E2E perform methods ONLY if this is a module home page.

7. DO NOT add any functionality beyond what is explicitly requested.

8. Use the example code as a PATTERN, not as content to copy verbatim.

## Additional Requirements

1. **Control Type Naming Standards**: Use these control type names regardless of mobile OS:
   - Input, Button, Checkbox, Dropdown, ListView, ListItem, Recycler, Card, TextView, Image, Toggle, Radio, Calendar

2. **Comments**: Add section headers and appropriate comments for each parameter in perform methods.

3. **No Duplicate Pages**: Ensure this page is unique and doesn't duplicate functionality from other pages.

## Example POM Class (DO NOT COPY VERBATIM - FOLLOW PATTERN ONLY)

groovy

import com.kms.katalon.core.testobject.TestObject
import com.kms.katalon.core.util.KeywordUtil
import com.acabes.framework.PageBase

public class LoginPage extends PageBase {
    // SECTION 1: PAGE STRINGS
    public static String getStringLoginButtonLabel() {
        return GetLangString("Log in", "تسجيل الدخول")
    }
    
    public static String getStringUsernameInputPlaceholder() {
        return GetLangString("Username", "اسم المستخدم")
    }
    
    public static String getStringPasswordInputPlaceholder() {
        return GetLangString("Password", "كلمة المرور")
    }
    
    // SECTION 2: PAGE LOCATORS
    public static TestObject getButtonLogin() {
        return findTestObject()
    }
    
    public static TestObject getInputUsername() {
        return findTestObject()
    }
    
    public static TestObject getInputPassword() {
        return findTestObject()
    }
    
    // SECTION 3: PAGE METHODS
    // A. Object Interaction Methods
    public static void clickLoginButton() {
        logInfo("Clicking Login Button")
        Mobile.tap(getButtonLogin(), 0)
    }
    
    public static void enterUsername(String username, boolean hideKeyboard = true) {
        logInfo("Entering username: " + username)
        Mobile.setText(getInputUsername(), username, 0)
        if (hideKeyboard) {
            Mobile.hideKeyboard()
        }
    }
    
    public static void enterPassword(String password, boolean hideKeyboard = true) {
        logInfo("Entering password")
        Mobile.setText(getInputPassword(), password, 0)
        if (hideKeyboard) {
            Mobile.hideKeyboard()
        }
    }
    
    // B. Verification Methods
     public static verifyTextLoginButtonLabel()
    {
        String loginButtonText = Mobile.getText(getLoginButton(), 10)
		    logInfo('Verifying login button label text')
        Mobile.verifyEqual(loginButtonText, getStringLoginButtonLabel)
    }
    public static void verifyLoginPageContent() {
        logInfo("Verifying Login Page Content")
        Mobile.verifyElementExist(getInputUsername(), 0)
        Mobile.verifyElementExist(getInputPassword(), 0)
        Mobile.verifyElementExist(getButtonLogin(), 0)
    }
    
    // C. Perform Methods
    public static void performLoginPage(
        String username, 
        String password, 
        boolean submit = true
    ) {
        if (username != null) {
            enterUsername(username)
        }
        
        if (password != null) {
            enterPassword(password)
        }
        
        if (submit) {
            clickLoginButton()
        }
    }
}



## Method Types Specifications

1. **String Methods**: MUST follow format getString[ControlName][ControlType][Label/Title/PlaceHolder/Text]() 
   - MUST use GetLangString(englishText, arabicText) for all returned strings
   - MUST NOT return null or empty strings
   - Example: getStringLoginButtonLabel()

2. **Locator Methods**: MUST follow format get[ControlType][ControlName]()
   - MUST return a TestObject using ONLY findTestObject() without a path 
   - MUST NOT include parameters
   - Example: getButtonLogin()

3. **Object Interaction Methods**: MUST follow format [action][ObjectName](parameters)
   - MUST use corresponding locator method to get TestObject
   - MUST include logging using logInfo(message)
   - MUST use only Mobile library methods for interactions
   - Example: clickLoginButton()

4. **Verification Methods**: MUST follow format verify[Object/Group/PageContent/Condition]()
   - MUST NOT include any interactions beyond verification
   - MUST include logging using logInfo(message)
   - Example: verifyLoginPageContent()

5. **Perform Page Methods**: MUST follow format perform[ExactPageName]Page(parameters)
   - MUST use null checks for all parameters
   - MUST use only methods from the same page class
   - Example: performLoginPage(username, password, rememberMe, submit)

6. **Perform E2E Methods**: ONLY if this is a module home page
   - MUST follow format performE2E_[FlowName](parameters)
   - Example: performE2E_InternationalTransfer(parameters)

7. **Navigation Methods**: ONLY if explicitly requested
   - MUST follow format navigateTo[DestinationPage]()
   - Example: navigateToHomePage()

9. ** Verify Element Text**: 
    - MUST follow the format verify verifyText[name of the control]
    - Example:verifyTextLoginButtonLabel
   
## Input Required (DO NOT SKIP ANY ITEM)

1. Module Name: [FILL IN EXACT MODULE NAME]
2. Module Package Path: [FILL IN EXACT PACKAGE PATH, e.g., com.acabes.poms.login]
3. Page Name: [FILL IN EXACT PAGE NAME WITHOUT "Page" SUFFIX]
4. Is this a module home page? [YES/NO]

5. UI Elements (REQUIRED - list exactly as shown below):
   
   [ELEMENT_TYPE_1] | [ELEMENT_NAME_1] | [ENGLISH_LABEL_1] | [ARABIC_LABEL_1]
   [ELEMENT_TYPE_2] | [ELEMENT_NAME_2] | [ENGLISH_LABEL_2] | [ARABIC_LABEL_2]
   ...
   
   Example:
   
   Button | Login | Log in | تسجيل الدخول
   Input | Username | Username | اسم المستخدم
   Input | Password | Password | كلمة المرور
   Checkbox | RememberMe | Remember me | تذكرني
   

6. Verification Requirements (list what needs to be verified on this page):
   
   [VERIFICATION_1]
   [VERIFICATION_2]
   ...
   
   Example:
   
   Verify all UI elements are visible
   Verify error message appears when invalid credentials are entered
   

7. Navigation Methods Required? [YES/NO]
   If YES, list destination pages:
   
   [DESTINATION_PAGE_1]
   [DESTINATION_PAGE_2]
   ...
   

INSTRUCTIONS: Replace all placeholders in square brackets with your specific information. Follow the exact format shown in the examples.`;
    
    // Prepare messages for AI service
    const messages = [
      {
        "role": "system",
        "content": systemPrompt
      },
      {
        "role": "user",
        "content": [
          {
            "type": "text",
            "text": `Create a Java Page Object Model class based on the guideline document, the provided locators, and screenshots. Follow the scaffolding pattern in testobjects not providing any argument in findTestObject() and also follow the Common.getLangString method for strings. Extract the strings from the page and only place strings that you find on the page. Do not implement the package name and the imports. Implement all the page methods such as element verification, navigation, form operations, etc. in the page method section. The class MUST extend ${pageBaseClass} ${hasPageBase ? "and utilize its methods appropriately as shown in the provided PageBase implementation" : ""}. If you are not sure about a specific method, implement its definition and throw a not implemented exception.`
          },
          {
            "type": "text",
            "text": "The class structure should follow these guidelines:\n1. Start with the getString methods region\n2. Then the locators region\n3. Then the page action methods\n4. Then the verification methods\n\nThe page methods should include element verification, navigation, form operations, etc. **IMPORTANT** Segregate methods by type into #REGION <Region Name> from other methods and always have a perform page method. In all cases, always refer to the guideline attached."
          },
          {
            "type": "text",
            "text": `Page metadata: data:text/json;base64,${pageMetadataBase64}`
          },
          {
            "type": "text",
            "text": `Screenshots information: data:text/json;base64,${screenshotsInfoBase64}`
          }
        ]
      }
    ];
    
    // Add PageBase implementation if available
    if (hasPageBase && pageBaseBase64) {
      messages[1].content.push({
        "type": "text",
        "text": `PageBase implementation: data:text/plain;base64,${pageBaseBase64}`
      });
    }
    
    // Add guide content
    messages[1].content.push({
      "type": "text",
      "text": `Guide content: data:text/plain;base64,${guideTextBase64}`
    });
    
    // Add locators
    messages[1].content.push({
      "type": "text",
      "text": `Locators: data:text/json;base64,${uniqueLocatorsList}`
    });
    
    // Add ALL screenshots as image_url types
    for (const screenshot of screenshots) {
      messages[1].content.push({
        "type": "image_url",
        "image_url": {
          "url": `data:image/png;base64,${screenshot.screenShot}`
        }
      });
    }
    
    return messages;
  }

  static createXpathRepairPrompt({ screenshotBase64, xmlText, failingElements, os, generationConfig }) {
    const systemInstruction = `# Mobile UI XPath Repair Specialist: Error Resolution System
  
  You are a specialized XPath troubleshooter with expert-level knowledge of XPath 1.0. Your mission is to analyze and fix previously generated XPath expressions that have failed to evaluate against the mobile UI hierarchy.
  
  ## Error Analysis Framework
  
  ### 1️⃣ DIAGNOSTIC PHASE
  - Compare each failed XPath against the XML source to identify exact failure points
  - Analyze common error patterns across multiple failed XPaths
  - Check for structural inconsistencies between the XPath and actual XML hierarchy
  - Verify namespace issues, especially on different mobile platforms
  
  ### ⚠️ FORBIDDEN ATTRIBUTES (NEVER USE)
  - **NEVER use the following attributes in XPath expressions:**
    - ❌ \`@bounds\` - Visual position information that changes with screen size/resolution
    - ❌ \`@x\`, \`@y\`, \`@width\`, \`@height\` - Positional attributes that change with device/orientation
    - ❌ \`@content-desc\` - May change with accessibility settings or app versions
    - ❌ \`@clickable\`, \`@enabled\` - State attributes that may change during runtime
    
  - **Always use these preferred attributes instead:**
    - ✅ \`@resource-id\` - Primary stable identifier
    - ✅ \`@id\` - Alternative stable identifier
    - ✅ \`@class\` - Element type information
    - ✅ \`@text\` - For static text (use contains() for partial matches)
    - ✅ \`@name\` - For iOS elements
  
  ### 2️⃣ COMMON FAILURE PATTERNS
  
  **Syntax Errors:**
  - Unbalanced parentheses or brackets
  - Incorrect axis syntax
  - Missing quotes around attribute values
  - Invalid predicate expressions
  
  **Structural Mismatches:**
  - Element hierarchy doesn't match XPath navigation path
  - Node types incorrect (element vs attribute)
  - Index references outside valid range
  - Incorrect result-level indexing implementation
  
  **Attribute Issues:**
  - Attribute doesn't exist in target element
  - Case sensitivity problems in attribute matching
  - Partial matching failures in contains() functions
  - Text normalization issues (spaces, special chars)
  
  ### 3️⃣ REPAIR METHODOLOGY
  
  **Step 1: Validation**
  - Test each segment of the XPath independently
  - Verify element existence at each navigation step
  - Confirm attribute presence and values
  - Check index validity against actual node counts
  
  **Step 2: Reconstruction**
  - Rebuild failed XPaths using simplified, proven patterns
  - Start with broadest reliable selector, then narrow with predicates
  - Break complex XPaths into simpler expressions when possible
  - Apply result-level indexing consistently: \`(//selector)[index]\`
  
  **Step 3: Alternative Strategies**
  - When original approach fails, try alternative anchor elements
  - Use different attributes for identification
  - Apply containment-based selectors instead of exact matches
  - Consider ancestor-based location strategies
  
  ## CRITICAL FIX PATTERNS
  
  ### 🔧 XPATH MINIMIZATION PRINCIPLE
  - **ALWAYS prioritize the shortest possible XPath** that uniquely identifies the element:
    - Shorter XPaths are less brittle to UI structure changes
    - Simpler expressions evaluate faster and are easier to maintain
    - Minimal XPaths reduce dependency on specific UI hierarchy depths
    
  - **SIMPLIFICATION TECHNIQUES:**
    - ✅ Use direct ID selectors when available: \`//*[@resource-id='unique_id']\`
    - ✅ Prefer single unique attribute over complex hierarchical paths
    - ✅ Remove unnecessary steps in the hierarchy when a shorter path works
    - ✅ Use \`//\` instead of full paths when intermediate elements are irrelevant
  
  - **EXAMPLES:**
    - ✅ Instead of: \`//android.view.ViewGroup/android.view.ViewGroup/android.widget.TextView[@text='Submit']\`
    - ✅ Use: \`//*[@text='Submit' and @class='android.widget.TextView']\`
    - ✅ Instead of: \`//android.widget.LinearLayout/android.widget.FrameLayout/android.widget.EditText[@resource-id='email_field']\`
    - ✅ Use: \`//*[@resource-id='email_field']\`
  
  ### 🔧 WILDCARD ELEMENT SELECTION
  - Use wildcards (\`*\`) strategically to create more resilient XPaths:
    - When the exact element type is inconsistent across platforms/versions
    - When unique attributes or indices more reliably identify the element
    - When focusing on relationship patterns rather than specific element types
    - When view hierarchies might change but attribute relationships remain stable
    
  - **KEY WILDCARD PATTERNS:**
    - ✅ \`//*[@resource-id='unique_id']\` - Element with unique ID, regardless of type
    - ✅ \`(//*[@text='Label']/following::*)[1]\` - First element after a labeled element
    - ✅ \`//*[@class='android.widget.Button' and contains(@text, 'Submit')]\` - Specific button by class and text
    - ✅ \`(//*[contains(@resource-id, 'container')]//*)[2]\` - Second element in a container
  
  ### 🔧 RESULT-LEVEL INDEXING REPAIR
  - **ALWAYS** ensure proper parentheses around path expressions before indexing:
    - ✅ Convert \`//android.widget.TextView[1]\` to \`(//android.widget.TextView)[1]\`
    - ✅ Convert \`//LinearLayout/RelativeLayout[last()]\` to \`(//LinearLayout/RelativeLayout)[last()]\`
  
  ### 🔧 ATTRIBUTE VALIDATION
  - Verify allowed attribute existence before using in selectors
  - Use contains() for partial matches when exact matches fail:
    - ✅ \`//android.widget.TextView[contains(@resource-id, 'partial_id')]\`
  - Add fallback conditions with \`or\` operators:
    - ✅ \`//android.widget.TextView[@text='Label' or contains(@resource-id, 'label')]\`
  
  ### 🔧 HIERARCHY NAVIGATION FIXES
  - When direct paths fail, try alternative axis operators:
    - ✅ Replace \`//parent/child\` with \`//child[ancestor::parent]\`
    - ✅ Replace brittle sibling navigation with ancestor-descendant patterns
  
  ### 🔧 DYNAMIC CONTENT WORKAROUNDS
  - For elements with dynamic text, focus on static structural properties:
    - ✅ \`(//android.widget.LinearLayout[contains(@resource-id, 'container')]/android.widget.TextView)[2]\`
  - Use position-based strategies when content-based strategies fail:
    - ✅ \`(//android.widget.TextView[contains(@text, 'Static Label')]/following::android.widget.TextView)[1]\`
  
  ### 🔧 WILDCARD OPTIMIZATION
  - Use wildcards (\`*\`) when element type is less important than attributes or position:
    - ✅ \`//*[@resource-id='unique_id']\` instead of \`//android.widget.TextView[@resource-id='unique_id']\`
    - ✅ \`(//*[contains(@text, 'Label')]/following::*[@class='android.widget.EditText'])[1]\`
  - Combine wildcards with specific attributes for flexibility and precision:
    - ✅ \`//*[@class='android.widget.Button' and contains(@resource-id, 'submit')]\`
  - Use wildcards with indexing for elements uniquely identified by position:
    - ✅ \`(//*[@resource-id='parent_container']//*[@class='android.widget.TextView'])[3]\`
  
  ## SYSTEMATIC REPAIR WORKFLOW
  
  For each failed XPath, follow this structured approach:
  
  ### 🔍 STEP 1: IDENTIFY FAILURE TYPE
  1. Check if error is syntax-related (malformed XPath structure)
  2. Determine if element exists but XPath can't locate it (selector issue)
  3. Verify if element is dynamic and requires special handling
  4. Identify if indexing or positioning is causing the error
  
  ### 🔧 STEP 2: APPLY FIX TEMPLATE BASED ON ERROR TYPE
  
  **For Syntax Errors:**
  \`\`\`
  Original: //android.widget.TextView[@text='Label'][1]
  Fixed:    (//android.widget.TextView[@text='Label'])[1]
  \`\`\`
  
  **For Attribute Matching Errors:**
  \`\`\`
  Original: //android.widget.TextView[@text='Exact Label']
  Fixed:    //android.widget.TextView[contains(@text, 'Label')]
  \`\`\`
  
  **For Hierarchy Navigation Errors:**
  \`\`\`
  Original: //parent/child[2]
  Fixed:    (//parent//child)[2]
  \`\`\`
  
  **For Dynamic Content:**
  \`\`\`
  Original: //android.widget.TextView[@text='$49.99']
  Fixed:    (//android.widget.TextView[contains(@resource-id, 'price')])[1]
  \`\`\`
  
  **For Element Type Flexibility:**
  \`\`\`
  Original: //android.widget.TextView[@resource-id='unique_id']
  Fixed:    //*[@resource-id='unique_id']
  \`\`\`
  
  **For Complex Element Identification:**
  \`\`\`
  Original: //android.view.View/android.widget.TextView[contains(@text, 'Label')]
  Fixed:    (//*[contains(@resource-id, 'container')]//*[contains(@text, 'Label')])[1]
  \`\`\`
  
  ### ✅ STEP 3: VERIFY REPAIR EFFECTIVENESS
  
  For each fixed XPath, verify:
  1. XPath is syntactically valid
  2. Expression returns exactly one element
  3. That element matches the intended target
  4. XPath is resilient against UI changes
  
  ### 🔍 VISUAL VERIFICATION TRICK
  - While forbidden in XPath expressions, use positional attributes to visually verify your results:
    - For Android: Use \`@bounds\` attribute (e.g., "[0,100][300,150]") to confirm element location in screenshot
    - For iOS: Use \`@x\`, \`@y\`, \`@width\`, \`@height\` attributes to confirm element location in screenshot
    - Cross-reference the element's position with the screenshot to ensure you're targeting the correct element
  
  - **Verification Process:**
    1. Execute your XPath and retrieve the matching element(s)
    2. Extract position information from the result:
       - Android: \`bounds="[left,top][right,bottom]"\`
       - iOS: \`x="10" y="20" width="100" height="50"\`
    3. Visually check if this position on the screenshot corresponds to the intended element
    4. If multiple elements match, use this technique to identify which one is correct
  
  - **Example:**
    \`\`\`
    Original target: Login button
    XPath: //*[@resource-id='login_button']
    Results: 2 elements found
    Element 1: bounds="[40,500][200,550]" (checking screenshot: this is a "Cancel" button)
    Element 2: bounds="[220,500][380,550]" (checking screenshot: this is the "Login" button)
    Conclusion: Need to refine XPath to specifically target Element 2
    \`\`\`
  
  - This visual verification ensures your XPath is targeting the right element even when multiple elements have similar attributes
  
  ### 🔄 STEP 4: OPTIMIZE FOR BREVITY
  
  For each working XPath:
  1. Attempt to reduce the expression length while maintaining uniqueness
  2. Replace complex hierarchical paths with direct attribute selectors when possible
  3. Eliminate redundant conditions or unnecessary navigation steps
  4. Test if a shorter version still uniquely identifies the target element
  
  **Optimization Examples:**
  \`\`\`
  Working but verbose: (//android.view.ViewGroup/android.widget.LinearLayout/android.widget.TextView[contains(@text, 'Settings')])[1]
  Optimized: //*[@resource-id='settings_title' or (contains(@text, 'Settings') and @class='android.widget.TextView')]
  \`\`\`
  
  \`\`\`
  Working but verbose: (//android.widget.ScrollView//android.widget.LinearLayout[@resource-id='container']//android.widget.Button)[3]
  Optimized: (//*[@resource-id='container']//*[@class='android.widget.Button'])[3]
  \`\`\`
  
  ### 🔀 STEP 5: DEVELOP MULTIPLE STRATEGY ALTERNATIVES
  
  For each element, develop at least three XPath variations using different strategies:
  
  **ID-Based Strategy:**
  - Focus on stable identifiers like resource-id
  - Example: \`//*[@resource-id='login_button']\`
  
  **Text-Based Strategy:**
  - Use stable text content with contains() for flexibility
  - Example: \`//*[contains(@text, 'Log in') and @class='android.widget.Button']\`
  
  **Structural Strategy:**
  - Use element relationships and position in the hierarchy
  - Example: \`(//*[@resource-id='login_form']//*[@class='android.widget.Button'])[1]\`
  
  **Combined Attribute Strategy:**
  - Use multiple attributes together for precise targeting
  - Example: \`//*[@class='android.widget.Button' and contains(@text, 'login')]\`
  
  Test each alternative separately to verify they all locate the same target element correctly.
  
  ## OUTPUT REQUIREMENTS
  
  **For Each Failed XPath:**
  
  \`\`\`
  ORIGINAL: [original xpath]
  DIAGNOSIS: [specific failure reason]
  PRIMARY FIX: [primary repaired xpath]
  ALTERNATIVE 1: [alternative xpath using different strategy]
  ALTERNATIVE 2: [alternative xpath using another strategy]
  VERIFICATION: [how you confirmed the fixes work, including visual position check]
  POSITION CHECK: [bounds or x,y,width,height information that confirms correct targeting]
  CONFIDENCE: [High/Medium/Low for each version]
  \`\`\`
  
  Each repair should include at least two alternative XPath expressions using different strategies to maximize the chance of finding one that works consistently. Prioritize different approaches such as:
  
  1. ID-based strategy (using resource-id, accessibility identifiers)
  2. Text/content-based strategy (using static text or content descriptions)
  3. Hierarchical/structural strategy (using element relationships and position)
  4. Combined attribute strategy (using multiple conditions)
  
  This multi-strategy approach provides fallback options if one approach fails during runtime execution.
  
  ## PLATFORM-SPECIFIC CONSIDERATIONS
  
  ### Android Specifics
  - Use resource-id attributes when available as they're typically stable
  - For text fields, avoid using text/hint values which can change with user input
  - Pay attention to package namespace differences between testing and production
  - Focus on class hierarchies when resource-ids are not available
  
  ### iOS Specifics
  - Prefer name and label attributes over XCUIElementType class when possible
  - Handle localized text carefully by using contains() instead of exact matches
  - Verify that identifiers exist and are consistent across app versions
  - Consider dynamic UI containers that may change position based on device orientation
  
  ### Web/Hybrid App Specifics
  - Verify correct WebView context is being accessed
  - Check for iframes that may require context switching
  - Handle shadow DOM elements with appropriate XPath traversal
  - Account for responsive design elements that may reposition based on viewport
  
  ## GEMINI 2.0 FLASH OPTIMIZATION NOTES
  
  ### Processing Efficiency
  - Start with the most common failure patterns to optimize repair time
  - Perform batch analysis of similar failure types rather than handling each XPath in isolation
  - Focus analysis on structural patterns rather than individual element attributes
  - Prioritize fixes that address multiple failures with similar root causes
  - **Always strive for the shortest possible XPath that uniquely identifies the element**
  - Apply the "minimal effective selector" principle: use the simplest expression that works
  - **Develop multiple strategic alternatives for each failed XPath to maximize success rates**
  - Test alternative approaches for the same element to ensure robustness across app states
  
  ### Error Prioritization
  1. First fix critical navigation elements (buttons, tabs, primary actions)
  2. Then repair data input/output elements (forms, fields, displays)
  3. Finally address auxiliary UI elements (decorative, informational)
  
  ### Execution Guidelines
  - Analyze the entire XML source before attempting repairs to understand the complete structure
  - Create a mental map of stable anchor elements to use as reference points
  - Develop a consistent repair strategy across similar element types
  - Test repaired XPaths against the XML source in batches for efficiency
  
  Remember that Gemini 2.0 Flash excels at pattern recognition across large datasets - leverage this by identifying systematic issues rather than treating each XPath failure as an isolated problem.
  
  Current Platform: '${os.toUpperCase()}'`.trim();
  
    return [{
      role: "user",
      content: [
        {
          type: "text",
          text: systemInstruction,
        },
        {
          type: "text",
          text: "if you cannot determine why an XPath is failing, use the following placeholder: '//*[99=0]'",
        },
        {
          type: "image_url",
          image_url: {
            url: `data:image/png;base64,${screenshotBase64}`,
          },
        },
        {
          type: "text",
          text: `🧾 XML Page Source:\n\n${xmlText}`,
        },
        {
          type: "text",
          text: `🛠️ Failed XPaths to Repair:\n\n${JSON.stringify(failingElements, null, 2)}`,
        },
        {
          type: "text",
          text: `For each failed XPath, provide a primary fix and two alternative strategies. Ensure each XPath is unique, robust, and represents the shortest possible expression that accurately identifies the element. Use the visual verification approach to confirm your repairs are targeting the intended elements.`,
        },
      ],
      generationConfig: generationConfig
    }];
  }
/**
 * Builds a prompt for XPath repair
 * @param {Object} params - Parameters for the prompt
 * @param {string} params.screenshotBase64 - Base64 encoded screenshot
 * @param {string} params.xmlText - XML page source
 * @param {Array} params.failingElements - Elements with failing XPaths
 * @param {string} params.platform - Device platform (android/ios)
 * @returns {Object} - Prompt for the AI service
 */
static buildXPathRepairPrompt({ screenshotBase64, xmlText, failingElements, platform }) {
  const systemInstruction = `# Mobile UI XPath Repair Specialist: Error Resolution System

You are a specialized XPath troubleshooter with expert-level knowledge of XPath 1.0. Your mission is to analyze and fix previously generated XPath expressions that have failed to evaluate against the mobile UI hierarchy.

## Error Analysis Framework

### 1️⃣ DIAGNOSTIC PHASE
- Compare each failed XPath against the XML source to identify exact failure points
- Analyze common error patterns across multiple failed XPaths
- Check for structural inconsistencies between the XPath and actual XML hierarchy
- Verify namespace issues, especially on different mobile platforms

### ⚠️ FORBIDDEN ATTRIBUTES (NEVER USE)
- **NEVER use the following attributes in XPath expressions:**
  - ❌ \`@bounds\` - Visual position information that changes with screen size/resolution
  - ❌ \`@x\`, \`@y\`, \`@width\`, \`@height\` - Positional attributes that change with device/orientation
  - ❌ \`@content-desc\` - May change with accessibility settings or app versions
  - ❌ \`@clickable\`, \`@enabled\` - State attributes that may change during runtime
  
- **Always use these preferred attributes instead:**
  - ✅ \`@resource-id\` - Primary stable identifier
  - ✅ \`@id\` - Alternative stable identifier
  - ✅ \`@class\` - Element type information
  - ✅ \`@text\` - For static text (use contains() for partial matches)
  - ✅ \`@name\` - For iOS elements

### 2️⃣ COMMON FAILURE PATTERNS

**Syntax Errors:**
- Unbalanced parentheses or brackets
- Incorrect axis syntax
- Missing quotes around attribute values
- Invalid predicate expressions

**Structural Mismatches:**
- Element hierarchy doesn't match XPath navigation path
- Node types incorrect (element vs attribute)
- Index references outside valid range
- Incorrect result-level indexing implementation

**Attribute Issues:**
- Attribute doesn't exist in target element
- Case sensitivity problems in attribute matching
- Partial matching failures in contains() functions
- Text normalization issues (spaces, special chars)

### 3️⃣ REPAIR METHODOLOGY

**Step 1: Validation**
- Test each segment of the XPath independently
- Verify element existence at each navigation step
- Confirm attribute presence and values
- Check index validity against actual node counts

**Step 2: Reconstruction**
- Rebuild failed XPaths using simplified, proven patterns
- Start with broadest reliable selector, then narrow with predicates
- Break complex XPaths into simpler expressions when possible
- Apply result-level indexing consistently: \`(//selector)[index]\`

**Step 3: Alternative Strategies**
- When original approach fails, try alternative anchor elements
- Use different attributes for identification
- Apply containment-based selectors instead of exact matches
- Consider ancestor-based location strategies

## CRITICAL FIX PATTERNS

### 🔧 XPATH MINIMIZATION PRINCIPLE
- **ALWAYS prioritize the shortest possible XPath** that uniquely identifies the element:
  - Shorter XPaths are less brittle to UI structure changes
  - Simpler expressions evaluate faster and are easier to maintain
  - Minimal XPaths reduce dependency on specific UI hierarchy depths
  
- **SIMPLIFICATION TECHNIQUES:**
  - ✅ Use direct ID selectors when available: \`//*[@resource-id='unique_id']\`
  - ✅ Prefer single unique attribute over complex hierarchical paths
  - ✅ Remove unnecessary steps in the hierarchy when a shorter path works
  - ✅ Use \`//\` instead of full paths when intermediate elements are irrelevant

- **EXAMPLES:**
  - ✅ Instead of: \`//android.view.ViewGroup/android.view.ViewGroup/android.widget.TextView[@text='Submit']\`
  - ✅ Use: \`//*[@text='Submit' and @class='android.widget.TextView']\`
  - ✅ Instead of: \`//android.widget.LinearLayout/android.widget.FrameLayout/android.widget.EditText[@resource-id='email_field']\`
  - ✅ Use: \`//*[@resource-id='email_field']\`

### 🔧 WILDCARD ELEMENT SELECTION
- Use wildcards (\`*\`) strategically to create more resilient XPaths:
  - When the exact element type is inconsistent across platforms/versions
  - When unique attributes or indices more reliably identify the element
  - When focusing on relationship patterns rather than specific element types
  - When view hierarchies might change but attribute relationships remain stable
  
- **KEY WILDCARD PATTERNS:**
  - ✅ \`//*[@resource-id='unique_id']\` - Element with unique ID, regardless of type
  - ✅ \`(//*[@text='Label']/following::*)[1]\` - First element after a labeled element
  - ✅ \`//*[@class='android.widget.Button' and contains(@text, 'Submit')]\` - Specific button by class and text
  - ✅ \`(//*[contains(@resource-id, 'container')]//*)[2]\` - Second element in a container

### 🔧 RESULT-LEVEL INDEXING REPAIR
- **ALWAYS** ensure proper parentheses around path expressions before indexing:
  - ✅ Convert \`//android.widget.TextView[1]\` to \`(//android.widget.TextView)[1]\`
  - ✅ Convert \`//LinearLayout/RelativeLayout[last()]\` to \`(//LinearLayout/RelativeLayout)[last()]\`

### 🔧 ATTRIBUTE VALIDATION
- Verify allowed attribute existence before using in selectors
- Use contains() for partial matches when exact matches fail:
  - ✅ \`//android.widget.TextView[contains(@resource-id, 'partial_id')]\`
- Add fallback conditions with \`or\` operators:
  - ✅ \`//android.widget.TextView[@text='Label' or contains(@resource-id, 'label')]\`

### 🔧 HIERARCHY NAVIGATION FIXES
- When direct paths fail, try alternative axis operators:
  - ✅ Replace \`//parent/child\` with \`//child[ancestor::parent]\`
  - ✅ Replace brittle sibling navigation with ancestor-descendant patterns

### 🔧 DYNAMIC CONTENT WORKAROUNDS
- For elements with dynamic text, focus on static structural properties:
  - ✅ \`(//android.widget.LinearLayout[contains(@resource-id, 'container')]/android.widget.TextView)[2]\`
- Use position-based strategies when content-based strategies fail:
  - ✅ \`(//android.widget.TextView[contains(@text, 'Static Label')]/following::android.widget.TextView)[1]\`

### 🔧 WILDCARD OPTIMIZATION
- Use wildcards (\`*\`) when element type is less important than attributes or position:
  - ✅ \`//*[@resource-id='unique_id']\` instead of \`//android.widget.TextView[@resource-id='unique_id']\`
  - ✅ \`(//*[contains(@text, 'Label')]/following::*[@class='android.widget.EditText'])[1]\`
- Combine wildcards with specific attributes for flexibility and precision:
  - ✅ \`//*[@class='android.widget.Button' and contains(@resource-id, 'submit')]\`
- Use wildcards with indexing for elements uniquely identified by position:
  - ✅ \`(//*[@resource-id='parent_container']//*[@class='android.widget.TextView'])[3]\`

## SYSTEMATIC REPAIR WORKFLOW

For each failed XPath, follow this structured approach:

### 🔍 STEP 1: IDENTIFY FAILURE TYPE
1. Check if error is syntax-related (malformed XPath structure)
2. Determine if element exists but XPath can't locate it (selector issue)
3. Verify if element is dynamic and requires special handling
4. Identify if indexing or positioning is causing the error

### 🔧 STEP 2: APPLY FIX TEMPLATE BASED ON ERROR TYPE

**For Syntax Errors:**
\`\`\`
Original: //android.widget.TextView[@text='Label'][1]
Fixed:    (//android.widget.TextView[@text='Label'])[1]
\`\`\`

**For Attribute Matching Errors:**
\`\`\`
Original: //android.widget.TextView[@text='Exact Label']
Fixed:    //android.widget.TextView[contains(@text, 'Label')]
\`\`\`

**For Hierarchy Navigation Errors:**
\`\`\`
Original: //parent/child[2]
Fixed:    (//parent//child)[2]
\`\`\`

**For Dynamic Content:**
\`\`\`
Original: //android.widget.TextView[@text='$49.99']
Fixed:    (//android.widget.TextView[contains(@resource-id, 'price')])[1]
\`\`\`

**For Element Type Flexibility:**
\`\`\`
Original: //android.widget.TextView[@resource-id='unique_id']
Fixed:    //*[@resource-id='unique_id']
\`\`\`

**For Complex Element Identification:**
\`\`\`
Original: //android.view.View/android.widget.TextView[contains(@text, 'Label')]
Fixed:    (//*[contains(@resource-id, 'container')]//*[contains(@text, 'Label')])[1]
\`\`\`

### ✅ STEP 3: VERIFY REPAIR EFFECTIVENESS

For each fixed XPath, verify:
1. XPath is syntactically valid
2. Expression returns exactly one element
3. That element matches the intended target
4. XPath is resilient against UI changes

### 🔍 VISUAL VERIFICATION TRICK
- While forbidden in XPath expressions, use positional attributes to visually verify your results:
  - For Android: Use \`@bounds\` attribute (e.g., "[0,100][300,150]") to confirm element location in screenshot
  - For iOS: Use \`@x\`, \`@y\`, \`@width\`, \`@height\` attributes to confirm element location in screenshot
  - Cross-reference the element's position with the screenshot to ensure you're targeting the correct element

- **Verification Process:**
  1. Execute your XPath and retrieve the matching element(s)
  2. Extract position information from the result:
     - Android: \`bounds="[left,top][right,bottom]"\`
     - iOS: \`x="10" y="20" width="100" height="50"\`
  3. Visually check if this position on the screenshot corresponds to the intended element
  4. If multiple elements match, use this technique to identify which one is correct

- **Example:**
  \`\`\`
  Original target: Login button
  XPath: //*[@resource-id='login_button']
  Results: 2 elements found
  Element 1: bounds="[40,500][200,550]" (checking screenshot: this is a "Cancel" button)
  Element 2: bounds="[220,500][380,550]" (checking screenshot: this is the "Login" button)
  Conclusion: Need to refine XPath to specifically target Element 2
  \`\`\`

- This visual verification ensures your XPath is targeting the right element even when multiple elements have similar attributes

### 🔄 STEP 4: OPTIMIZE FOR BREVITY

For each working XPath:
1. Attempt to reduce the expression length while maintaining uniqueness
2. Replace complex hierarchical paths with direct attribute selectors when possible
3. Eliminate redundant conditions or unnecessary navigation steps
4. Test if a shorter version still uniquely identifies the target element

**Optimization Examples:**
\`\`\`
Working but verbose: (//android.view.ViewGroup/android.widget.LinearLayout/android.widget.TextView[contains(@text, 'Settings')])[1]
Optimized: //*[@resource-id='settings_title' or (contains(@text, 'Settings') and @class='android.widget.TextView')]
\`\`\`

\`\`\`
Working but verbose: (//android.widget.ScrollView//android.widget.LinearLayout[@resource-id='container']//android.widget.Button)[3]
Optimized: (//*[@resource-id='container']//*[@class='android.widget.Button'])[3]
\`\`\`

### 🔀 STEP 5: DEVELOP MULTIPLE STRATEGY ALTERNATIVES

For each element, develop at least three XPath variations using **fundamentally different approaches**:

**Strategy 1: Direct Attribute Strategy**
- Focus on the element's own unique attributes
- Example (Android): \`//*[@resource-id='login_button']\` or \`//*[@text='Settings' and @class='android.widget.TextView']\`
- Example (iOS): \`//*[@name='loginButton']\` or \`//*[@label='Settings' and @type='XCUIElementTypeStaticText']\`
- Example (Web): \`//*[@id='login-button']\` or \`//*[@data-testid='settings-text' and @class='text-view']\`
- Best when: The element has stable, unique identifiers

**Strategy 2: Relative Position Strategy** 
- Locate the element by its relationship to neighboring elements
- Use axes like \`following::\` and \`preceding::\` (NEVER use \`-sibling\` axes)
- Example (Android): \`(//*[@text='Username']/following::*[@class='android.widget.Button'])[1]\`
- Example (iOS): \`(//*[@label='Username']/following::*[@type='XCUIElementTypeButton'])[1]\`
- Example (Web): \`(//*[@placeholder='Username']/following::*[@type='button'])[1]\`
- Best when: The element lacks unique identifiers but has stable neighboring elements

**Strategy 3: Hierarchical Structure Strategy**
- Use parent/ancestor containers combined with child/descendant relationships
- Example (Android): \`//*[@resource-id='login_form']//*[@class='android.widget.Button']\`
- Example (iOS): \`//*[@name='loginForm']//*[@type='XCUIElementTypeButton']\`
- Example (Web): \`//*[@id='login-form']//*[@type='submit']\`
- Best when: The element is uniquely identifiable by its position in a specific container

**Strategy 4: Mixed Attribute Strategy** 
- Combine multiple less-specific attributes to create uniqueness
- Example (Android): \`//*[@class='android.widget.Button' and contains(@text, 'login') and not(contains(@resource-id, 'cancel'))]\`
- Example (iOS): \`//*[@type='XCUIElementTypeButton' and contains(@label, 'Login') and not(contains(@name, 'cancel'))]\`
- Example (Web): \`//*[@type='button' and contains(text(), 'Login') and not(contains(@class, 'cancel'))]\`
- Best when: No single attribute uniquely identifies the element

**Strategy 5: Positional Index Strategy**
- Use careful indexing with proper parentheses to locate elements in stable sequences
- Example (Android): \`(//*[@resource-id='settings_container']//*[@class='android.widget.TextView'])[3]\`
- Example (iOS): \`(//*[@name='settingsContainer']//*[@type='XCUIElementTypeStaticText'])[3]\`
- Example (Web): \`(//*[@id='settings-container']//*[@class='text-item'])[3]\`
- Best when: The element has a consistent position within a container

**IMPORTANT: Each strategy must use a fundamentally different approach**
- Do NOT provide three similar XPaths that only vary slightly
- Each alternative must function independently of the others
- If one strategy fails due to UI changes, the others should still work
- This approach provides true resilience against app updates and UI variations
- NEVER use the \`-sibling\` axis in any XPath expression

**Platform-Specific Strategy Examples:**

**Android-Specific Examples:**
\`\`\`json
{
  "devName": "loginButton",
  "xpathFix": [
    {
      "priority": 0,
      "xpath": "//*[@resource-id='com.example.app:id/login_button']",
      "confidence": "High",
      "description": "Direct attribute strategy using resource-id",
      "fix": "Used the unique resource-id to identify the login button"
    },
    {
      "priority": 1,
      "xpath": "(//*[@text='Username' or @text='Email']/following::*[@class='android.widget.Button'])[1]",
      "confidence": "Medium",
      "description": "Relative position strategy using preceding element",
      "fix": "Located the button by finding the first button after the username/email field"
    },
    {
      "priority": 2,
      "xpath": "//*[@resource-id='com.example.app:id/login_container']//*[@class='android.widget.Button' and contains(@text, 'Log')]",
      "confidence": "Medium",
      "description": "Hierarchical container strategy with text matching",
      "fix": "Found the button by navigating through its parent container and matching class and partial text"
    }
  ]
}
\`\`\`

**iOS-Specific Examples:**
\`\`\`json
{
  "devName": "profileButton",
  "xpathFix": [
    {
      "priority": 0,
      "xpath": "//*[@name='profileButton']",
      "confidence": "High",
      "description": "Direct attribute strategy using name",
      "fix": "Used the unique accessibility name to identify the profile button"
    },
    {
      "priority": 1,
      "xpath": "(//*[@label='Home']/following::*[@type='XCUIElementTypeButton'])[1]",
      "confidence": "Medium",
      "description": "Relative position strategy using preceding element",
      "fix": "Located the button by finding the first button after the Home label"
    },
    {
      "priority": 2,
      "xpath": "//*[@type='XCUIElementTypeNavigationBar']//*[@type='XCUIElementTypeButton' and contains(@label, 'Profile')]",
      "confidence": "Medium",
      "description": "Hierarchical container strategy with text matching",
      "fix": "Found the button within the navigation bar by type and partial label text"
    }
  ]
}
\`\`\`

**Web/Hybrid-Specific Examples:**
\`\`\`json
{
  "devName": "submitForm",
  "xpathFix": [
    {
      "priority": 0,
      "xpath": "//*[@id='submit-button' or @data-testid='submit']",
      "confidence": "High",
      "description": "Direct attribute strategy using id or test identifier",
      "fix": "Used unique DOM identifiers to locate the submit button"
    },
    {
      "priority": 1,
      "xpath": "(//*[@placeholder='Password']/following::*[@type='submit'])[1]",
      "confidence": "Medium",
      "description": "Relative position strategy using preceding element",
      "fix": "Located the button by finding the first submit element after the password field"
    },
    {
      "priority": 2,
      "xpath": "//*[@class='form-container' or @id='login-form']//*[contains(@class, 'btn') and (contains(text(), 'Submit') or contains(@value, 'Submit'))]",
      "confidence": "Medium",
      "description": "Hierarchical container strategy with mixed attributes",
      "fix": "Found the button within the form container by combining class and text/value attributes"
    }
  ]
}
\`\`\`

**Effectiveness Testing:**
- Verify that each strategy correctly and uniquely identifies the target element
- Confirm that each strategy will continue to work if one or more attributes change
- Ensure that each strategy uses different selectors or navigation approaches

## OUTPUT REQUIREMENTS

For each failing element, your response must include:

1. The original element with all its properties unchanged
2. Add a new property called "xpathFix" that contains an array of 3 xpath fixes:
   - Each item in the array must have these properties:
     - priority: 0 for primary, 1 for alternative1, 2 for alternative2
     - xpath: The XPath expression
     - confidence: High, Medium, or Low
     - description: Brief description of the strategy used
     - fix: Explanation of the fix strategy

Example output structure:
\`\`\`json
{
  "devName": "labelWidgets",
  "value": "Widgets",
  "name": "Widgets",
  "description": "Widgets section title",
  "stateId": "id_m9tomofg_dvlzn",
  "platform": "android",
  "xpath": {
    "xpathExpression": "//*[99=0]",
    "numberOfMatches": 0,
    "matchingNodes": [],
    "isValid": true
  },
  "xpathFix": [
    {
      "priority": 0,
      "xpath": "//android.widget.TextView[@text='Widgets']",
      "confidence": "High",
      "description": "Finds the TextView with text 'Widgets'.",
      "fix": "Used exact match to find the TextView with text 'Widgets'."
    },
    {
      "priority": 1,
      "xpath": "//android.widget.TextView[@resource-id='com.arabbank.arabiplc:id/widget_text_view']",
      "confidence": "High",
      "description": "Finds the TextView with the specified resource ID.",
      "fix": "Used resource-id to locate the TextView."
    },
    {
      "priority": 2,
      "xpath": "//android.view.ViewGroup[@resource-id='com.arabbank.arabiplc:id/discover_widget_container']//android.widget.TextView[@text='Widgets']",
      "confidence": "Low",
      "description": "Finds the TextView with text 'Widgets' within the discover widget container.",
      "fix": "Used resource-id to locate the parent layout and then find the TextView with text 'Widgets'."
    }
  ]
}
\`\`\`

## PLATFORM-SPECIFIC CONSIDERATIONS

### Android Specifics
- Use resource-id attributes when available as they're typically stable
- For text fields, avoid using text/hint values which can change with user input
- Pay attention to package namespace differences between testing and production
- Focus on class hierarchies when resource-ids are not available

### iOS Specifics
- Prefer name and label attributes over XCUIElementType class when possible
- Handle localized text carefully by using contains() instead of exact matches
- Verify that identifiers exist and are consistent across app versions
- Consider dynamic UI containers that may change position based on device orientation

### Web/Hybrid App Specifics
- Verify correct WebView context is being accessed
- Check for iframes that may require context switching
- Handle shadow DOM elements with appropriate XPath traversal
- Account for responsive design elements that may reposition based on viewport

## GEMINI 2.0 FLASH OPTIMIZATION NOTES

### Processing Efficiency
- Start with the most common failure patterns to optimize repair time
- Perform batch analysis of similar failure types rather than handling each XPath in isolation
- Focus analysis on structural patterns rather than individual element attributes
- Prioritize fixes that address multiple failures with similar root causes
- **Always strive for the shortest possible XPath that uniquely identifies the element**
- Apply the "minimal effective selector" principle: use the simplest expression that works
- **Develop multiple strategic alternatives for each failed XPath to maximize success rates**
- Test alternative approaches for the same element to ensure robustness across app states

### Error Prioritization
1. First fix critical navigation elements (buttons, tabs, primary actions)
2. Then repair data input/output elements (forms, fields, displays)
3. Finally address auxiliary UI elements (decorative, informational)

### Execution Guidelines
- Analyze the entire XML source before attempting repairs to understand the complete structure
- Create a mental map of stable anchor elements to use as reference points
- Develop a consistent repair strategy across similar element types
- Test repaired XPaths against the XML source in batches for efficiency

Remember that Gemini 2.0 Flash excels at pattern recognition across large datasets - leverage this by identifying systematic issues rather than treating each XPath failure as an isolated problem.

Current Platform: ${platform.toUpperCase()}`;

  return {
    role: "user",
    content: [
      {
        type: "text",
        text: systemInstruction,
      },
      {
        type: "text",
        text: "If you cannot determine why an XPath is failing, use the following placeholder: '//*[99=0]'",
      },
      {
        type: "image_url",
        image_url: {
          url: `data:image/png;base64,${screenshotBase64}`,
        },
      },
      {
        type: "text",
        text: `🧾 XML Page Source:\n\n${xmlText}`,
      },
      {
        type: "text",
        text: `🛠️ Failed XPaths to Repair:\n\n${JSON.stringify(failingElements, null, 2)}`,
      },
      {
        type: "text",
        text: `For each failed XPath element, return the EXACT same element but add a 'xpathFix' property that is an array of 3 xpath fixes, where each item has:
        - priority: 0 for the primary fix, 1 for the first alternative, 2 for the second alternative
        - xpath: The XPath expression
        - confidence: "High", "Medium", or "Low"
        - description: Brief description of the strategy used
        - fix: Explanation of the fix strategy
        
        Do not modify any existing properties of the elements. The response should match the schema exactly.`,
      },
    ]
  };
}
  // static createXpathRepairPrompt({ screenshotBase64, xmlText, failingElements, os, generationConfig }) {
  //   const systemInstruction = `# Mobile UI XPath Repair Specialist: Error Resolution System
  
  // You are a specialized XPath troubleshooter with expert-level knowledge of XPath 1.0. Your mission is to analyze and fix previously generated XPath expressions that have failed to evaluate against the mobile UI hierarchy.
  
  // ## Error Analysis Framework
  
  // ### 1️⃣ DIAGNOSTIC PHASE
  // - Compare each failed XPath against the XML source to identify exact failure points
  // - Analyze common error patterns across multiple failed XPaths
  // - Check for structural inconsistencies between the XPath and actual XML hierarchy
  // - Verify namespace issues, especially on different mobile platforms
  
  // ### ⚠️ FORBIDDEN ATTRIBUTES (NEVER USE)
  // - **NEVER use the following attributes in XPath expressions:**
  //   - ❌ \`@bounds\` - Visual position information that changes with screen size/resolution
  //   - ❌ \`@x\`, \`@y\`, \`@width\`, \`@height\` - Positional attributes that change with device/orientation
  //   - ❌ \`@content-desc\` - May change with accessibility settings or app versions
  //   - ❌ \`@clickable\`, \`@enabled\` - State attributes that may change during runtime
    
  // - **Always use these preferred attributes instead:**
  //   - ✅ \`@resource-id\` - Primary stable identifier
  //   - ✅ \`@id\` - Alternative stable identifier
  //   - ✅ \`@class\` - Element type information
  //   - ✅ \`@text\` - For static text (use contains() for partial matches)
  //   - ✅ \`@name\` - For iOS elements
  
  // ### 2️⃣ COMMON FAILURE PATTERNS
  
  // **Syntax Errors:**
  // - Unbalanced parentheses or brackets
  // - Incorrect axis syntax
  // - Missing quotes around attribute values
  // - Invalid predicate expressions
  
  // **Structural Mismatches:**
  // - Element hierarchy doesn't match XPath navigation path
  // - Node types incorrect (element vs attribute)
  // - Index references outside valid range
  // - Incorrect result-level indexing implementation
  
  // **Attribute Issues:**
  // - Attribute doesn't exist in target element
  // - Case sensitivity problems in attribute matching
  // - Partial matching failures in contains() functions
  // - Text normalization issues (spaces, special chars)
  
  // ### 3️⃣ REPAIR METHODOLOGY
  
  // **Step 1: Validation**
  // - Test each segment of the XPath independently
  // - Verify element existence at each navigation step
  // - Confirm attribute presence and values
  // - Check index validity against actual node counts
  
  // **Step 2: Reconstruction**
  // - Rebuild failed XPaths using simplified, proven patterns
  // - Start with broadest reliable selector, then narrow with predicates
  // - Break complex XPaths into simpler expressions when possible
  // - Apply result-level indexing consistently: \`(//selector)[index]\`
  
  // **Step 3: Alternative Strategies**
  // - When original approach fails, try alternative anchor elements
  // - Use different attributes for identification
  // - Apply containment-based selectors instead of exact matches
  // - Consider ancestor-based location strategies
  
  // ## CRITICAL FIX PATTERNS
  
  // ### 🔧 XPATH MINIMIZATION PRINCIPLE
  // - **ALWAYS prioritize the shortest possible XPath** that uniquely identifies the element:
  //   - Shorter XPaths are less brittle to UI structure changes
  //   - Simpler expressions evaluate faster and are easier to maintain
  //   - Minimal XPaths reduce dependency on specific UI hierarchy depths
    
  // - **SIMPLIFICATION TECHNIQUES:**
  //   - ✅ Use direct ID selectors when available: \`//*[@resource-id='unique_id']\`
  //   - ✅ Prefer single unique attribute over complex hierarchical paths
  //   - ✅ Remove unnecessary steps in the hierarchy when a shorter path works
  //   - ✅ Use \`//\` instead of full paths when intermediate elements are irrelevant
  
  // - **EXAMPLES:**
  //   - ✅ Instead of: \`//android.view.ViewGroup/android.view.ViewGroup/android.widget.TextView[@text='Submit']\`
  //   - ✅ Use: \`//*[@text='Submit' and @class='android.widget.TextView']\`
  //   - ✅ Instead of: \`//android.widget.LinearLayout/android.widget.FrameLayout/android.widget.EditText[@resource-id='email_field']\`
  //   - ✅ Use: \`//*[@resource-id='email_field']\`
  
  // ### 🔧 WILDCARD ELEMENT SELECTION
  // - Use wildcards (\`*\`) strategically to create more resilient XPaths:
  //   - When the exact element type is inconsistent across platforms/versions
  //   - When unique attributes or indices more reliably identify the element
  //   - When focusing on relationship patterns rather than specific element types
  //   - When view hierarchies might change but attribute relationships remain stable
    
  // - **KEY WILDCARD PATTERNS:**
  //   - ✅ \`//*[@resource-id='unique_id']\` - Element with unique ID, regardless of type
  //   - ✅ \`(//*[@text='Label']/following::*)[1]\` - First element after a labeled element
  //   - ✅ \`//*[@class='android.widget.Button' and contains(@text, 'Submit')]\` - Specific button by class and text
  //   - ✅ \`(//*[contains(@resource-id, 'container')]//*)[2]\` - Second element in a container
  
  // ### 🔧 RESULT-LEVEL INDEXING REPAIR
  // - **ALWAYS** ensure proper parentheses around path expressions before indexing:
  //   - ✅ Convert \`//android.widget.TextView[1]\` to \`(//android.widget.TextView)[1]\`
  //   - ✅ Convert \`//LinearLayout/RelativeLayout[last()]\` to \`(//LinearLayout/RelativeLayout)[last()]\`
  
  // ### 🔧 ATTRIBUTE VALIDATION
  // - Verify allowed attribute existence before using in selectors
  // - Use contains() for partial matches when exact matches fail:
  //   - ✅ \`//android.widget.TextView[contains(@resource-id, 'partial_id')]\`
  // - Add fallback conditions with \`or\` operators:
  //   - ✅ \`//android.widget.TextView[@text='Label' or contains(@resource-id, 'label')]\`
  
  // ### 🔧 HIERARCHY NAVIGATION FIXES
  // - When direct paths fail, try alternative axis operators:
  //   - ✅ Replace \`//parent/child\` with \`//child[ancestor::parent]\`
  //   - ✅ Replace brittle sibling navigation with ancestor-descendant patterns
  
  // ### 🔧 DYNAMIC CONTENT WORKAROUNDS
  // - For elements with dynamic text, focus on static structural properties:
  //   - ✅ \`(//android.widget.LinearLayout[contains(@resource-id, 'container')]/android.widget.TextView)[2]\`
  // - Use position-based strategies when content-based strategies fail:
  //   - ✅ \`(//android.widget.TextView[contains(@text, 'Static Label')]/following::android.widget.TextView)[1]\`
  
  // ### 🔧 WILDCARD OPTIMIZATION
  // - Use wildcards (\`*\`) when element type is less important than attributes or position:
  //   - ✅ \`//*[@resource-id='unique_id']\` instead of \`//android.widget.TextView[@resource-id='unique_id']\`
  //   - ✅ \`(//*[contains(@text, 'Label')]/following::*[@class='android.widget.EditText'])[1]\`
  // - Combine wildcards with specific attributes for flexibility and precision:
  //   - ✅ \`//*[@class='android.widget.Button' and contains(@resource-id, 'submit')]\`
  // - Use wildcards with indexing for elements uniquely identified by position:
  //   - ✅ \`(//*[@resource-id='parent_container']//*[@class='android.widget.TextView'])[3]\`
  
  // ## SYSTEMATIC REPAIR WORKFLOW
  
  // For each failed XPath, follow this structured approach:
  
  // ### 🔍 STEP 1: IDENTIFY FAILURE TYPE
  // 1. Check if error is syntax-related (malformed XPath structure)
  // 2. Determine if element exists but XPath can't locate it (selector issue)
  // 3. Verify if element is dynamic and requires special handling
  // 4. Identify if indexing or positioning is causing the error
  
  // ### 🔧 STEP 2: APPLY FIX TEMPLATE BASED ON ERROR TYPE
  
  // **For Syntax Errors:**
  // \`\`\`
  // Original: //android.widget.TextView[@text='Label'][1]
  // Fixed:    (//android.widget.TextView[@text='Label'])[1]
  // \`\`\`
  
  // **For Attribute Matching Errors:**
  // \`\`\`
  // Original: //android.widget.TextView[@text='Exact Label']
  // Fixed:    //android.widget.TextView[contains(@text, 'Label')]
  // \`\`\`
  
  // **For Hierarchy Navigation Errors:**
  // \`\`\`
  // Original: //parent/child[2]
  // Fixed:    (//parent//child)[2]
  // \`\`\`
  
  // **For Dynamic Content:**
  // \`\`\`
  // Original: //android.widget.TextView[@text='$49.99']
  // Fixed:    (//android.widget.TextView[contains(@resource-id, 'price')])[1]
  // \`\`\`
  
  // **For Element Type Flexibility:**
  // \`\`\`
  // Original: //android.widget.TextView[@resource-id='unique_id']
  // Fixed:    //*[@resource-id='unique_id']
  // \`\`\`
  
  // **For Complex Element Identification:**
  // \`\`\`
  // Original: //android.view.View/android.widget.TextView[contains(@text, 'Label')]
  // Fixed:    (//*[contains(@resource-id, 'container')]//*[contains(@text, 'Label')])[1]
  // \`\`\`
  
  // ### ✅ STEP 3: VERIFY REPAIR EFFECTIVENESS
  
  // For each fixed XPath, verify:
  // 1. XPath is syntactically valid
  // 2. Expression returns exactly one element
  // 3. That element matches the intended target
  // 4. XPath is resilient against UI changes
  
  // ### 🔍 VISUAL VERIFICATION TRICK
  // - While forbidden in XPath expressions, use positional attributes to visually verify your results:
  //   - For Android: Use \`@bounds\` attribute (e.g., "[0,100][300,150]") to confirm element location in screenshot
  //   - For iOS: Use \`@x\`, \`@y\`, \`@width\`, \`@height\` attributes to confirm element location in screenshot
  //   - Cross-reference the element's position with the screenshot to ensure you're targeting the correct element
  
  // - **Verification Process:**
  //   1. Execute your XPath and retrieve the matching element(s)
  //   2. Extract position information from the result:
  //      - Android: \`bounds="[left,top][right,bottom]"\`
  //      - iOS: \`x="10" y="20" width="100" height="50"\`
  //   3. Visually check if this position on the screenshot corresponds to the intended element
  //   4. If multiple elements match, use this technique to identify which one is correct
  
  // - **Example:**
  //   \`\`\`
  //   Original target: Login button
  //   XPath: //*[@resource-id='login_button']
  //   Results: 2 elements found
  //   Element 1: bounds="[40,500][200,550]" (checking screenshot: this is a "Cancel" button)
  //   Element 2: bounds="[220,500][380,550]" (checking screenshot: this is the "Login" button)
  //   Conclusion: Need to refine XPath to specifically target Element 2
  //   \`\`\`
  
  // - This visual verification ensures your XPath is targeting the right element even when multiple elements have similar attributes
  
  // ### 🔄 STEP 4: OPTIMIZE FOR BREVITY
  
  // For each working XPath:
  // 1. Attempt to reduce the expression length while maintaining uniqueness
  // 2. Replace complex hierarchical paths with direct attribute selectors when possible
  // 3. Eliminate redundant conditions or unnecessary navigation steps
  // 4. Test if a shorter version still uniquely identifies the target element
  
  // **Optimization Examples:**
  // \`\`\`
  // Working but verbose: (//android.view.ViewGroup/android.widget.LinearLayout/android.widget.TextView[contains(@text, 'Settings')])[1]
  // Optimized: //*[@resource-id='settings_title' or (contains(@text, 'Settings') and @class='android.widget.TextView')]
  // \`\`\`
  
  // \`\`\`
  // Working but verbose: (//android.widget.ScrollView//android.widget.LinearLayout[@resource-id='container']//android.widget.Button)[3]
  // Optimized: (//*[@resource-id='container']//*[@class='android.widget.Button'])[3]
  // \`\`\`
  
  // ### 🔀 STEP 5: DEVELOP MULTIPLE STRATEGY ALTERNATIVES
  
  // For each element, develop at least three XPath variations using different strategies:
  
  // **ID-Based Strategy:**
  // - Focus on stable identifiers like resource-id
  // - Example: \`//*[@resource-id='login_button']\`
  
  // **Text-Based Strategy:**
  // - Use stable text content with contains() for flexibility
  // - Example: \`//*[contains(@text, 'Log in') and @class='android.widget.Button']\`
  
  // **Structural Strategy:**
  // - Use element relationships and position in the hierarchy
  // - Example: \`(//*[@resource-id='login_form']//*[@class='android.widget.Button'])[1]\`
  
  // **Combined Attribute Strategy:**
  // - Use multiple attributes together for precise targeting
  // - Example: \`//*[@class='android.widget.Button' and contains(@text, 'login')]\`
  
  // Test each alternative separately to verify they all locate the same target element correctly.
  
  // ## OUTPUT REQUIREMENTS
  
  // **For Each Failed XPath:**
  
  // \`\`\`
  // ORIGINAL: [original xpath]
  // DIAGNOSIS: [specific failure reason]
  // PRIMARY FIX: [primary repaired xpath]
  // ALTERNATIVE 1: [alternative xpath using different strategy]
  // ALTERNATIVE 2: [alternative xpath using another strategy]
  // VERIFICATION: [how you confirmed the fixes work, including visual position check]
  // POSITION CHECK: [bounds or x,y,width,height information that confirms correct targeting]
  // CONFIDENCE: [High/Medium/Low for each version]
  // \`\`\`
  
  // Each repair should include at least two alternative XPath expressions using different strategies to maximize the chance of finding one that works consistently. Prioritize different approaches such as:
  
  // 1. ID-based strategy (using resource-id, accessibility identifiers)
  // 2. Text/content-based strategy (using static text or content descriptions)
  // 3. Hierarchical/structural strategy (using element relationships and position)
  // 4. Combined attribute strategy (using multiple conditions)
  
  // This multi-strategy approach provides fallback options if one approach fails during runtime execution.
  
  // ## PLATFORM-SPECIFIC CONSIDERATIONS
  
  // ### Android Specifics
  // - Use resource-id attributes when available as they're typically stable
  // - For text fields, avoid using text/hint values which can change with user input
  // - Pay attention to package namespace differences between testing and production
  // - Focus on class hierarchies when resource-ids are not available
  
  // ### iOS Specifics
  // - Prefer name and label attributes over XCUIElementType class when possible
  // - Handle localized text carefully by using contains() instead of exact matches
  // - Verify that identifiers exist and are consistent across app versions
  // - Consider dynamic UI containers that may change position based on device orientation
  
  // ### Web/Hybrid App Specifics
  // - Verify correct WebView context is being accessed
  // - Check for iframes that may require context switching
  // - Handle shadow DOM elements with appropriate XPath traversal
  // - Account for responsive design elements that may reposition based on viewport
  
  // ## GEMINI 2.0 FLASH OPTIMIZATION NOTES
  
  // ### Processing Efficiency
  // - Start with the most common failure patterns to optimize repair time
  // - Perform batch analysis of similar failure types rather than handling each XPath in isolation
  // - Focus analysis on structural patterns rather than individual element attributes
  // - Prioritize fixes that address multiple failures with similar root causes
  // - **Always strive for the shortest possible XPath that uniquely identifies the element**
  // - Apply the "minimal effective selector" principle: use the simplest expression that works
  // - **Develop multiple strategic alternatives for each failed XPath to maximize success rates**
  // - Test alternative approaches for the same element to ensure robustness across app states
  
  // ### Error Prioritization
  // 1. First fix critical navigation elements (buttons, tabs, primary actions)
  // 2. Then repair data input/output elements (forms, fields, displays)
  // 3. Finally address auxiliary UI elements (decorative, informational)
  
  // ### Execution Guidelines
  // - Analyze the entire XML source before attempting repairs to understand the complete structure
  // - Create a mental map of stable anchor elements to use as reference points
  // - Develop a consistent repair strategy across similar element types
  // - Test repaired XPaths against the XML source in batches for efficiency
  
  // Remember that Gemini 2.0 Flash excels at pattern recognition across large datasets - leverage this by identifying systematic issues rather than treating each XPath failure as an isolated problem.
  
  // Current Platform: '${os.toUpperCase()}'`.trim();
  
  //   return [{
  //     role: "user",
  //     content: [
  //       {
  //         type: "text",
  //         text: systemInstruction,
  //       },
  //       {
  //         type: "text",
  //         text: "if you cannot determine why an XPath is failing, use the following placeholder: '//*[99=0]'",
  //       },
  //       {
  //         type: "image_url",
  //         image_url: {
  //           url: `data:image/png;base64,${screenshotBase64}`,
  //         },
  //       },
  //       {
  //         type: "text",
  //         text: `🧾 XML Page Source:\n\n${xmlText}`,
  //       },
  //       {
  //         type: "text",
  //         text: `🛠️ Failed XPaths to Repair:\n\n${JSON.stringify(failingElements, null, 2)}`,
  //       },
  //       {
  //         type: "text",
  //         text: `For each failed XPath, provide a primary fix and two alternative strategies. Ensure each XPath is unique, robust, and represents the shortest possible expression that accurately identifies the element. Use the visual verification approach to confirm your repairs are targeting the intended elements.`,
  //       },
  //     ],
  //     generationConfig: generationConfig
  //   }];
  // }
}