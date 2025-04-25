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

Current Platform: '${os.toUpperCase()}'`
//   const OLD_systemInstruction =`You are an expert in mobile app UI analysis and XPath generation.  
// USE XPATH 1.0 ONLY.

// Your task is to generate **robust, production-grade XPath expressions** for each UI element using:
// - A screenshot of the app screen
// - The raw XML source of the page

// 🔒 DO NOT modify or remove any of the following element properties:
// - devName
// - name
// - description
// - value
// - isDynamicValue
// - stateId

// ✅ Only ADD a new property called 'xpathLocator' to each element.
// This property must contain a **unique and reliable XPath expression** to locate the element in the XML.

// ---

// ## 📌 PRIORITIZED XPATH STRATEGIES

// ### 1️⃣ ✅ Indexing Format (Top Priority – Critical)

// To ensure XPath expressions are unique and structurally consistent:

// - ✅ Always use **result-level indexing**:
//   - First match: '(//your-xpath)[n]'
//   - Last match: '(//your-xpath)[last()]'
//   - Specific index: '(//your-xpath)[index]'
//   - Chained sub-paths: '(//your-xpath-first-part)[n]/second-part'

// - ❌ Never use indexing **inside the path**:
//   - '//your-xpath[1]' — ❌ INVALID
//   - '//your-xpath[last()]' — ❌ INVALID
//   - '//your-xpath-part[1]/second-part' — ❌ INVALID

// > ⚠️ This is **very important**. Use '()' to wrap result sets before indexing.

// ---

// ### 2️⃣ 🧾 User Input Fields & Editable Elements (Strict Handling)

// Editable elements such as input fields ('EditText', 'TextField', etc.) must be handled carefully:

// - 🔴 **NEVER** use the actual content of the field in your XPath:
//   - Do NOT match on:
//     - '@text'
//     - '@value'
//     - '@hint' or placeholder

//   ❌ **Examples of invalid XPath expressions**:
//   - '//android.widget.EditText[@text='user@example.com']'
//   - '//XCUIElementTypeTextField[@value='123456']'

//   These values are user-generated or device-generated and **will change**.

// - ✅ **Correct Strategy**:
//   1. **Locate a nearby static label element** — typically a 'TextView', 'Label', or static heading that consistently appears above or beside the input.
//   2. Use 'following::' or 'preceding::' axes to navigate from the label to the input field.
//   3. Use **result-level indexing** for precision.

//   ✅ **Example (correct format):**  
//   ${os.toUpperCase()!='IOS'?"(//android.widget.TextView[contains(@text, 'Email')]/following::android.widget.EditText)[1]":"(//XCUIElementTypeStaticText[contains(@text, 'Email')]/following::XCUIElementTypeTextField)[1]"}
  

// - ⚠️ If the label is **not available in XML**:
//   - Use a **known static sibling or visual anchor** that *is* in the XML (e.g. an icon, layout container).
//   - Traverse using 'following::' or 'preceding::' and index from there.

// - 🧠 Treat all input fields as dynamic — avoid relying on anything inside them (text, hint, value) for XPath matching.

// ---

// ### 3️⃣ 🔁 Dynamic or Changing Text Elements

// - Applies to elements like:
//   - Personalized user info (e.g., names, usernames, balances)
//   - Dynamic content (e.g., time, dates, session data)
//   - Variable states (e.g., "Success", "Pending", "Processing")

// - 🔴 DO NOT match or anchor based on this text.

// - ✅ Instead:
//   - Use nearby **static context** — like titles, headings, icons — and traverse using:
//     - 'preceding::'
//     - 'following::'
//     - 'ancestor::'
//     - Combined with result-level indexing.

//   ✅ Example:  
  
//   ${os.toUpperCase()!='IOS'?"\'(//android.widget.TextView[contains(@text, 'Balance')]/following::android.widget.TextView)[1]\'":"\'//XCUIElementTypeStaticText[contains(@name, 'Balance')]/following::XCUIElementTypeStaticText[1]\'"}

// ---

// ### 4️⃣ ↕️ Axis Usage Rules

// - 🔴 NEVER use:
//   - 'following-sibling::'
//   - 'preceding-sibling::'
// - ✅ ALWAYS use:
//   - 'following::'
//   - 'preceding::'
//   - 'ancestor::'
//   - 'descendant::'

// These are layout-resilient and ideal for dynamic mobile screens.

// ---

// ### 5️⃣ 🧠 General XPath Best Practices

// - Prefer relative paths with strong attributes like:
//   - '@resource-id', '@content-desc', '@class'
// - Avoid absolute paths.
// - Combine axis, structure, and result indexing.

// ---

// ### 6️⃣ ❌ Fallback Expression

// - If no reliable XPath can be constructed:
//   - Use the placeholder: '//*[99=0]'

// ---

// ## 📤 Output Format

// Return a JSON array of the **original input elements**, each with one added key: 'xpathLocator'.
// **VERY IMPORTANT**: The xpathLocator must be unique for each element.
// **VERY IMPORTANT**: Do not touch any other property of the elements, do not add or remove any other property.
// ---

// Platform: '${os.toUpperCase()}'
// `
.trim(); 
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
  
  static async generateStatesPrompt(page, generationConfig,os) {
    const old_baseInstruction = `
      You are a software test engineer. Identify every visible object in the screenshots, regardless of whether it is a string or a UI element.
      Include small and large items, duplicates, and overlapping elements (handle deduplication).
      If an element contains a string or visible text, assign it to value and check if it's a dynamic value.
      
      Important rules:
      - The same elemet may appear in multiple states because those screenshots may overlap. Only include it once from the first state it shows in.
      - devName must be unique per element type. If duplicates exist, only keep the first instance.
      - follow this convention for devName: <object type: the control type such as label, button,input, etc..><objectName: clear name that cannot be mistaken or confused> in camelCase.
      - Element count must be >= string count.
      - Ignore the top system bar that has the time/battery/network.
      Possible kinds of elements:button,text_field,password_field,checkbox,radio_button,dropdown,dropdown_body,spinner,switch,toggle,slider,stepper,label,text,link,image,icon,modal,dialog,toast,tab,tab_bar,menu,menu_item,accordion,list,list_item,table,table_row,table_cell,grid,grid_item,card,carousel,progress_bar,activity_indicator,search_bar,datepicker,timepicker,datetimepicker,scroll_view,video,canvas,map,tooltip,floating_button,form,form_field,avatar,badge,breadcrumb,code_block,divider,navbar,pagination,overlay,drawer,expansion_panel,toolbar,app_bar,context_menu
      **IMPORTANT** OS VERSION FOR THIS PROMPT: ${os}
    `.trim();
    const baseInstruction=`UI Element Detection from Overlapping Screenshots
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

json
Copy
Edit
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

ini
Copy
Edit
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

plaintext
Copy
Edit
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
`
const baseInstruction_=`# UI Analysis Engine for Test Engineers

You are a precise UI element detector for software testing. Your mission is to create a comprehensive catalog of interactive and visual elements from screenshots, prioritizing accuracy and completeness.

## Core Analysis Process

1. **Contextual Scanning** (High Priority)
   - Perform a multi-pass scan starting with container elements, then nested components
   - Analyze each element in relation to its surrounding objects and parent containers
   - Use spatial relationships to detect UI patterns (forms, lists, navigational elements)

2. **Element Detection** (High Priority)  
   - Identify ALL visible objects regardless of size, depth, or partial visibility
   - Include interactive controls, static text, images, and decorative elements
   - Prioritize interactive components that might be testable targets

3. **Text Processing** (Medium Priority)
   - For elements containing text, capture under 'value' property
   - Tag values as '"dynamic": true' if they appear to be runtime-generated (timestamps, counters, user data)
   - Consider text styling and positioning to determine if it's a label, heading, or content

4. **Deduplication Strategy** (High Priority)
   - Elements appearing across multiple screenshots are recorded only once (first occurrence)
   - Generate a unique visual signature based on type + position + visual characteristics
   - Track already-processed elements in an internal registry to prevent duplication

5. **Naming Convention** (Medium Priority)
   - Assign unique 'devName' in camelCase following '<elementType><descriptiveName>' format
   - Element type must be one from the approved list
   - Ensure names are contextually relevant (e.g., 'buttonSubmit' rather than generic 'button1')
   - For ambiguous elements, append discriminators based on location or context

## Special Case Handling

- **Partially Visible Elements**: Include if >25% visible and function is clear
- **Nested Components**: Parse both container and children, preserving hierarchy
- **Overlapping States**: When screenshots represent the same view in different states, tag elements with state information
- **Low-Contrast Elements**: Use contextual clues and patterns to identify subtle UI components
- **Custom Components**: Map to closest standard type, noting any special behaviors
- **System Bars**: Always ignore status/navigation bars with system information

## Validation Rules

1. **Completeness Check**: Element count MUST be ≥ string count
2. **Uniqueness Check**: Every 'devName' MUST be unique per element type
3. **Context Analysis**: Every UI element MUST be evaluated in relationship to surrounding elements
4. **Functional Grouping**: Related controls should be identified as belonging to the same functional group

## Element Type Taxonomy
Use ONLY these types:
button, textField, passwordField, checkbox, radioButton, dropdown, dropdownBody, spinner, switch, toggle, slider, stepper, label, text, link, image, icon, modal, dialog, toast, tab, tabBar, menu, menuItem, accordion, list, listItem, table, tableRow, tableCell, grid, gridItem, card, carousel, progressBar, activityIndicator, searchBar, datePicker, timePicker, dateTimePicker, scrollView, video, canvas, map, tooltip, floatingButton, form, formField, avatar, badge, breadcrumb, codeBlock, divider, navbar, pagination, overlay, drawer, expansionPanel, toolbar, appBar, contextMenu

## Output Format
Provide a single, deduplicated list of all UI elements adhering to these principles, formatted as structured data with type, devName, value (if applicable), and dynamic flag (if applicable).

Current OS Version: ${os}`
// 6. OUTPUT FORMAT:
//    Return a JSON array named '"elements"', where each element is an object with these keys:
//      {  
//        '"devName"': string,  
//        '"type"': string,  
//        '"bounds"': { x, y, width, height },  
//        '"value"': string (if any),  
//        '"dynamic"': boolean,  
//      }

    // Provide the following JSON format output as an array:

    // [
    //   {
    //     "isDynamicValue": true|false,
    //     "devName": String,
    //     "name": String,
    //     "description": String,
    //     "stateId": String,
    //     "value": String
    //   }
    // ]

    const content = [{ type: "text", text: baseInstruction }];

    for (const state of page.states) {
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
    }

    return {
      role: "user",
      content,
      generationConfig,
    };
  }

  static createValidationPrompt(initialPrompt, firstResponseContent,os) {
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
    // Provide the output in the following JSON format:
    // [
    //   {
    //     "devName": String,
    //     "name": String,
    //     "description": String,
    //     "stateId": String,
    //     "value": String,
    //     "isDynamicValue": true|false
    //   }
    // ]
    const content = [{ type: "text", text: baseInstruction }];

    for (const state of page.states) {
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
  let systemPrompt = `Please read and follow the coding guideline in the files provided. The files include: 1) Locators for the elements in JSON format, 2) Multiple screenshots from different states and platforms showing the page functionality, `;
  
  if (hasPageBase) {
    systemPrompt += `3) The PageBase class implementation that the POM class must extend, and 4) A guide with coding standards. You will be creating a Java Page Object Model class that extends the provided ${pageBaseClass} class.`;
  } else {
    systemPrompt += `3) A guide with coding standards. You will be creating a Java Page Object Model class that extends the ${pageBaseClass} class.`;
  }
  

  systemPrompt=`# Prompt for Creating a Standardized Page Object Model Class

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
   

INSTRUCTIONS: Replace all placeholders in square brackets with your specific information. Follow the exact format shown in the examples.`
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
}

