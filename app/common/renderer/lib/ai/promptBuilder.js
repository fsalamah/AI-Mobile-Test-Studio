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
    const baseInstruction_=`You are a software test engineer. Your task is to analyze one or more overlapping screenshots and output a deduplicated list of every visible object, whether it’s a UI control or text string. Follow this exact procedure:

1. PREPARE:
   • Ignore any status/system bar (time, battery, network) at the top of each image.  
   • Know that OS version is: ${os}

2. DETECTION:
   • Identify every object – large or small, text or graphic, control or label.  
   • Include duplicates and overlaps initially; de‑duplication comes later.  
   • If an object contains visible text, capture that under '"value"', and flag '"dynamic": true' if it looks like a runtime value (e.g., dates, counts).

3. DE‑DUPLICATION ACROSS STATES:
   • Screenshots may overlap states; if the same object appears in multiple images, only keep the first one you encountered.  
   • Maintain a global registry of seen objects keyed by type + location/shape to avoid repeats.

4. NAMING (devName):
   • For each object, assign a unique '"devName"' in camelCase using '<type><clearName>':
     – '<type>' = one of [button, textField, passwordField, checkbox, …, contextMenu]  
     – '<clearName>' = a concise, unambiguous identifier (e.g. submitButton, usernameField).  
   • If two controls of the same type would get the same name, only keep the first instance.

5. COUNT CHECK:
   • Ensure total elements ≥ total strings.  
   • If strings outnumber elements, re‑examine for missed containers or list items until this rule holds.


6. ELEMENT TYPES:
   Use only these types:  
   button, textField, passwordField, checkbox, radioButton, dropdown, dropdownBody, spinner, switch, toggle, slider, stepper, label, text, link, image, icon, modal, dialog, toast, tab, tabBar, menu, menuItem, accordion, list, listItem, table, tableRow, tableCell, grid, gridItem, card, carousel, progressBar, activityIndicator, searchBar, datePicker, timePicker, dateTimePicker, scrollView, video, canvas, map, tooltip, floatingButton, form, formField, avatar, badge, breadcrumb, codeBlock, divider, navbar, pagination, overlay, drawer, expansionPanel, toolbar, appBar, contextMenu

Implement this logic in a single pass over the screenshots so that you minimize missed objects and avoid redundant entries.
`
const baseInstruction=`# UI Analysis Engine for Test Engineers

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

}

