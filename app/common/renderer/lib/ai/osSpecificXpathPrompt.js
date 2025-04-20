/**
 * Returns a platform-specific UI analysis and XPath generation prompt
 * @param {string} platform - The platform to generate the prompt for: "ios", "android", or "web"
 * @returns {string} The platform-specific prompt
 */
function getPlatformSpecificPrompt(platform) {
  // Normalize platform input to lowercase
  const normalizedPlatform = platform.toLowerCase();

  // Base prompt structure shared across all platforms
  let basePrompt = `You are an expert in mobile app UI analysis and XPath generation.  
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
  - First match: '(//your-xpath)[1]'
  - Last match: '(//your-xpath)[last()]'
  - Specific index: '(//your-xpath)[index]'
  - Chained sub-paths: '(//your-xpath-first-part)[1]/second-part'

- ❌ Never use indexing **inside the path**:
  - '//your-xpath[1]' — ❌ INVALID
  - '//your-xpath[last()]' — ❌ INVALID
  - '//your-xpath-part[1]/second-part' — ❌ INVALID

> ⚠️ This is **very important**. Use '()' to wrap result sets before indexing.

---

### 2️⃣ 🧾 User Input Fields & Editable Elements (Strict Handling)

Editable elements such as input fields (`;

  // Platform-specific examples for input fields
  const platformSpecificInputFields = {
    android: `'EditText'`) must be handled carefully:

- 🔴 **NEVER** use the actual content of the field in your XPath:
  - Do NOT match on:
    - '@text'
    - '@value'
    - '@hint' or placeholder

  ❌ **Examples of invalid XPath expressions**:
  - '//android.widget.EditText[@text='user@example.com']'
  - '//android.widget.EditText[@hint='Password']'

  These values are user-generated or device-generated and **will change**.

- ✅ **Correct Strategy**:
  1. **Locate a nearby static label element** — typically a 'TextView' that consistently appears above or beside the input.
  2. Use 'following::' or 'preceding::' axes to navigate from the label to the input field.
  3. Use **result-level indexing** for precision.

  ✅ **Example (correct format):**  
  '(//android.widget.TextView[contains(@text, 'Email')]/following::android.widget.EditText)[1]'`,

    ios: `'TextField', 'SecureTextField'`) must be handled carefully:

- 🔴 **NEVER** use the actual content of the field in your XPath:
  - Do NOT match on:
    - '@value'
    - '@label' 
    - '@placeholder'

  ❌ **Examples of invalid XPath expressions**:
  - '//XCUIElementTypeTextField[@value='user@example.com']'
  - '//XCUIElementTypeSecureTextField[@value='123456']'

  These values are user-generated or device-generated and **will change**.

- ✅ **Correct Strategy**:
  1. **Locate a nearby static label element** — typically a 'XCUIElementTypeStaticText' that consistently appears above or beside the input.
  2. Use 'following::' or 'preceding::' axes to navigate from the label to the input field.
  3. Use **result-level indexing** for precision.

  ✅ **Example (correct format):**  
  '(//XCUIElementTypeStaticText[contains(@label, 'Email')]/following::XCUIElementTypeTextField)[1]'`,

    web: `'input', 'textarea'`) must be handled carefully:

- 🔴 **NEVER** use the actual content of the field in your XPath:
  - Do NOT match on:
    - '@value'
    - 'text()'
    - '@placeholder'

  ❌ **Examples of invalid XPath expressions**:
  - '//input[@value='user@example.com']'
  - '//textarea[text()='Some content']'

  These values are user-generated or device-generated and **will change**.

- ✅ **Correct Strategy**:
  1. **Locate a nearby static label element** — typically a 'label' or heading that consistently appears above or beside the input.
  2. Use 'following::' or 'preceding::' axes to navigate from the label to the input field.
  3. Use **result-level indexing** for precision.

  ✅ **Example (correct format):**  
  '(//label[contains(text(), 'Email')]/following::input)[1]'`
  };

  // Platform-specific examples for dynamic text elements
  const platformSpecificDynamicText = {
    android: `- Applies to elements like:
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
  '(//android.widget.TextView[contains(@text, 'Balance')]/following::android.widget.TextView)[1]'`,

    ios: `- Applies to elements like:
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
  '(//XCUIElementTypeStaticText[contains(@label, 'Balance')]/following::XCUIElementTypeStaticText)[1]'`,

    web: `- Applies to elements like:
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
  '(//h2[contains(text(), 'Balance')]/following::span)[1]'`
  };

  // Platform-specific best practices
  const platformSpecificBestPractices = {
    android: `- Prefer relative paths with strong attributes like:
  - '@resource-id', '@content-desc', '@class'
- Avoid absolute paths.
- Combine axis, structure, and result indexing.`,

    ios: `- Prefer relative paths with strong attributes like:
  - '@name', '@type', '@accessible'
- Avoid absolute paths.
- Combine axis, structure, and result indexing.`,

    web: `- Prefer relative paths with strong attributes like:
  - '@id', '@class', '@data-*' attributes
- Avoid absolute paths.
- Combine axis, structure, and result indexing.`
  };

  // Rest of the prompt
  const endPrompt = `---

### 6️⃣ ❌ Fallback Expression

- If no reliable XPath can be constructed:
  - Use the placeholder: '//*[99=0]'

---

## 📤 Output Format

Return a JSON array of the **original input elements**, each with one added key: 'xpathLocator'.
**VERY IMPORTANT**: The xpathLocator must be unique for each element.
**VERY IMPORTANT**: Do not touch any other property of the elements, do not add or remove any other property.
---

Platform: '${normalizedPlatform.toUpperCase()}'`;

  // Ensure valid platform is provided
  if (!['android', 'ios', 'web'].includes(normalizedPlatform)) {
    return `Invalid platform: ${platform}. Please use "android", "ios", or "web".`;
  }

  // Assemble the complete prompt
  const fullPrompt = `${basePrompt}${platformSpecificInputFields[normalizedPlatform]}

---

### 3️⃣ 🔁 Dynamic or Changing Text Elements

${platformSpecificDynamicText[normalizedPlatform]}

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

${platformSpecificBestPractices[normalizedPlatform]}

${endPrompt}`;

  return fullPrompt;
}

// ------------------------------
// USAGE EXAMPLES
// ------------------------------

/**
 * Displays a prompt for the given platform
 * @param {string} platform - The platform to display the prompt for
 */
function displayPrompt(platform) {
  console.log(`\n=== ${platform.toUpperCase()} PROMPT ===\n`);
  const prompt = getPlatformSpecificPrompt(platform);
  console.log(prompt);
  console.log("\n====================\n");
}

/**
 * Save prompt to a file
 * @param {string} platform - The platform to save the prompt for
 * @param {string} [filename] - Optional filename, defaults to platform name
 */
function savePromptToFile(platform, filename = null) {
  // This is a mock function as file system operations aren't available in this environment
  // In a real Node.js environment, you would use the fs module
  const targetFilename = filename || `${platform.toLowerCase()}_xpath_prompt.txt`;
  const prompt = getPlatformSpecificPrompt(platform);
  
  console.log(`Saving ${platform.toUpperCase()} prompt to ${targetFilename}`);
  // In real implementation:
  // const fs = require('fs');
  // fs.writeFileSync(targetFilename, prompt);
}

/**
 * Generate prompts for all supported platforms
 * @returns {Object} An object containing prompts for all platforms
 */
function generateAllPrompts() {
  const platforms = ["android", "ios", "web"];
  const result = {};
  
  platforms.forEach(platform => {
    result[platform] = getPlatformSpecificPrompt(platform);
  });
  
  return result;
}

// Example 1: Display Android prompt
displayPrompt("android");

// Example 2: Display iOS prompt
displayPrompt("ios");

// Example 3: Display Web prompt
displayPrompt("web");

// Example 4: Handle invalid platform
try {
  const invalidPrompt = getPlatformSpecificPrompt("windows");
  console.log("Invalid platform result:", invalidPrompt);
} catch (error) {
  console.error("Error:", error.message);
}

// Example 5: Case insensitive platform names
const iosPromptLowercase = getPlatformSpecificPrompt("ios");
const iosPromptUppercase = getPlatformSpecificPrompt("IOS");
console.log("Case insensitivity check:", iosPromptLowercase === iosPromptUppercase ? "PASSED" : "FAILED");

// Example 6: Save prompts to files (mock)
savePromptToFile("android");
savePromptToFile("ios", "custom_ios_prompt.md");

// Example 7: Generate all prompts at once
const allPrompts = generateAllPrompts();
console.log("Generated prompts for all platforms:", Object.keys(allPrompts).join(", "));

// Example 8: Using in a testing scenario
function mockAutomationTestSetup(platform) {
  console.log(`Setting up automated testing for ${platform.toUpperCase()} platform`);
  const prompt = getPlatformSpecificPrompt(platform);
  console.log(`Generated prompt with length: ${prompt.length} characters`);
  console.log(`Platform identifier in prompt: ${platform.toUpperCase()}`);
  return {
    platform,
    promptGenerated: true,
    promptLength: prompt.length
  };
}

const testSetup = mockAutomationTestSetup("android");
console.log("Test setup complete:", testSetup);