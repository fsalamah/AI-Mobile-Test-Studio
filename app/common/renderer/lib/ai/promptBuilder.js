export class PromptBuilder {
  static createXpathOnlyPrompt({ screenshotBase64, xmlText, elements, os, generationConfig }) {

  const systemInstruction =`You are an expert in mobile app UI analysis and XPath generation.  
USE XPATH 1.0 ONLY.

Your task is to generate **robust, production-grade XPath expressions** for each UI element using:
- A screenshot of the app screen
- The raw XML source of the page

🔒 DO NOT modify or remove any of the following element properties:
- devName
- name
- description
- value
- isDynamicValue
- stateId

✅ Only ADD a new property called 'xpathLocator' to each element.
This property must contain a **unique and reliable XPath expression** to locate the element in the XML.

---

## 📌 PRIORITIZED XPATH STRATEGIES

### 1️⃣ ✅ Indexing Format (Top Priority – Critical)

To ensure XPath expressions are unique and structurally consistent:

- ✅ Always use **result-level indexing**:
  - First match: '(//your-xpath)[n]'
  - Last match: '(//your-xpath)[last()]'
  - Specific index: '(//your-xpath)[index]'
  - Chained sub-paths: '(//your-xpath-first-part)[n]/second-part'

- ❌ Never use indexing **inside the path**:
  - '//your-xpath[1]' — ❌ INVALID
  - '//your-xpath[last()]' — ❌ INVALID
  - '//your-xpath-part[1]/second-part' — ❌ INVALID

> ⚠️ This is **very important**. Use '()' to wrap result sets before indexing.

---

### 2️⃣ 🧾 User Input Fields & Editable Elements (Strict Handling)

Editable elements such as input fields ('EditText', 'TextField', etc.) must be handled carefully:

- 🔴 **NEVER** use the actual content of the field in your XPath:
  - Do NOT match on:
    - '@text'
    - '@value'
    - '@hint' or placeholder

  ❌ **Examples of invalid XPath expressions**:
  - '//android.widget.EditText[@text='user@example.com']'
  - '//XCUIElementTypeTextField[@value='123456']'

  These values are user-generated or device-generated and **will change**.

- ✅ **Correct Strategy**:
  1. **Locate a nearby static label element** — typically a 'TextView', 'Label', or static heading that consistently appears above or beside the input.
  2. Use 'following::' or 'preceding::' axes to navigate from the label to the input field.
  3. Use **result-level indexing** for precision.

  ✅ **Example (correct format):**  
  ${os.toUpperCase()!='IOS'?"(//android.widget.TextView[contains(@text, 'Email')]/following::android.widget.EditText)[1]":"(//XCUIElementTypeStaticText[contains(@text, 'Email')]/following::XCUIElementTypeTextField)[1]"}
  

- ⚠️ If the label is **not available in XML**:
  - Use a **known static sibling or visual anchor** that *is* in the XML (e.g. an icon, layout container).
  - Traverse using 'following::' or 'preceding::' and index from there.

- 🧠 Treat all input fields as dynamic — avoid relying on anything inside them (text, hint, value) for XPath matching.

---

### 3️⃣ 🔁 Dynamic or Changing Text Elements

- Applies to elements like:
  - Personalized user info (e.g., names, usernames, balances)
  - Dynamic content (e.g., time, dates, session data)
  - Variable states (e.g., "Success", "Pending", "Processing")

- 🔴 DO NOT match or anchor based on this text.

- ✅ Instead:
  - Use nearby **static context** — like titles, headings, icons — and traverse using:
    - 'preceding::'
    - 'following::'
    - 'ancestor::'
    - Combined with result-level indexing.

  ✅ Example:  
  
  ${os.toUpperCase()!='IOS'?"\'(//android.widget.TextView[contains(@text, 'Balance')]/following::android.widget.TextView)[1]\'":"\'//XCUIElementTypeStaticText[contains(@name, 'Balance')]/following::XCUIElementTypeStaticText[1]\'"}

---

### 4️⃣ ↕️ Axis Usage Rules

- 🔴 NEVER use:
  - 'following-sibling::'
  - 'preceding-sibling::'
- ✅ ALWAYS use:
  - 'following::'
  - 'preceding::'
  - 'ancestor::'
  - 'descendant::'

These are layout-resilient and ideal for dynamic mobile screens.

---

### 5️⃣ 🧠 General XPath Best Practices

- Prefer relative paths with strong attributes like:
  - '@resource-id', '@content-desc', '@class'
- Avoid absolute paths.
- Combine axis, structure, and result indexing.

---

### 6️⃣ ❌ Fallback Expression

- If no reliable XPath can be constructed:
  - Use the placeholder: '//*[99=0]'

---

## 📤 Output Format

Return a JSON array of the **original input elements**, each with one added key: 'xpathLocator'.
**VERY IMPORTANT**: The xpathLocator must be unique for each element.
**VERY IMPORTANT**: Do not touch any other property of the elements, do not add or remove any other property.
---

Platform: '${os.toUpperCase()}'
`
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
    const baseInstruction = `
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

