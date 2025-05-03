/**
 * Appium Inspector Bookmarklet Generator
 * 
 * This module generates a bookmarklet that can be used to extract data
 * from Appium Inspector and send it to AI Studio without modifications
 * to the Appium Inspector codebase.
 */

// Define the base URL for AI Studio
const AI_STUDIO_BASE_URL = process.env.REACT_APP_AI_STUDIO_URL || 'http://localhost:3000';

/**
 * Create the bookmarklet code
 * This code will run in the context of Appium Inspector
 */
const createBookmarkletCode = (): string => {
  // This is the code that will be executed in Appium Inspector
  // It needs to be self-contained and not rely on external dependencies
  const code = `
    (function() {
      // Function to extract session data from Appium Inspector
      function extractAppiumData() {
        try {
          // Try to access Redux store through window.__STORE__
          // This is a common debugging pattern, adjust based on Appium Inspector's implementation
          const state = window.__REDUX_STATE__ || window.__STORE__ || {};
          
          // If we can't access the store directly, try to find it in DOM
          if (!state.session && !state.inspector) {
            // Look for any elements containing session data
            const sourceElements = document.querySelectorAll('pre');
            for (const el of sourceElements) {
              if (el.textContent && el.textContent.includes('<AppiumAUT>')) {
                return {
                  source: el.textContent,
                  screenshot: findScreenshot(),
                  sessionInfo: findSessionInfo()
                };
              }
            }
            alert('Error: Could not find Appium session data');
            return null;
          }
          
          // Extract data from Redux store
          return {
            sessionId: state.session?.sessionId,
            sessionInfo: state.session?.capabilities || {},
            source: state.inspector?.source || '',
            screenshot: state.inspector?.screenshot || findScreenshot(),
            // Add more data as needed
          };
        } catch (error) {
          console.error('Error extracting Appium data:', error);
          alert('Error extracting data from Appium Inspector: ' + error.message);
          return null;
        }
      }
      
      // Helper function to find screenshot in the DOM
      function findScreenshot() {
        // Look for images that might be the screenshot
        const images = document.querySelectorAll('img');
        for (const img of images) {
          // Typically the screenshot will be a data URL
          if (img.src && img.src.startsWith('data:image/')) {
            return img.src;
          }
        }
        return '';
      }
      
      // Helper function to find session info in the DOM
      function findSessionInfo() {
        // Try to find session info in text content
        const infoElements = document.querySelectorAll('.session-info, .capabilities');
        const sessionInfo = {};
        
        for (const el of infoElements) {
          const text = el.textContent;
          if (text) {
            // Look for platform information
            if (text.includes('platformName')) {
              const match = text.match(/platformName[\\s:"']+(\\w+)/i);
              if (match && match[1]) {
                sessionInfo.platformName = match[1];
              }
            }
            
            if (text.includes('platformVersion')) {
              const match = text.match(/platformVersion[\\s:"']+(\\d+\\.\\d+)/i);
              if (match && match[1]) {
                sessionInfo.platformVersion = match[1];
              }
            }
            
            if (text.includes('deviceName')) {
              const match = text.match(/deviceName[\\s:"']+(\\w[\\w\\s-]+)/i);
              if (match && match[1]) {
                sessionInfo.deviceName = match[1].trim();
              }
            }
          }
        }
        
        return sessionInfo;
      }
      
      // Extract data from Appium Inspector
      const appiumData = extractAppiumData();
      if (!appiumData) return;
      
      // Encode data for URL transmission
      const encodedData = encodeURIComponent(JSON.stringify(appiumData));
      
      // Open AI Studio with the data
      const aiStudioUrl = '${AI_STUDIO_BASE_URL}/import?data=' + encodedData;
      
      // Open in new tab
      window.open(aiStudioUrl, '_blank');
    })();
  `;
  
  // Minify the code by removing whitespace and comments
  return code
    .replace(/\s+/g, ' ')
    .replace(/\/\/.*?\n/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .trim();
};

/**
 * Generate the bookmarklet URL
 */
export const generateBookmarkletUrl = (): string => {
  const code = createBookmarkletCode();
  return `javascript:${encodeURIComponent(code)}`;
};

/**
 * Get bookmarklet installation instructions
 */
export const getBookmarkletInstructions = (): string => {
  return `
    1. Create a new bookmark in your browser
    2. Name it "Send to AI Studio"
    3. Paste the following code in the URL/location field:
       ${generateBookmarkletUrl()}
    4. Save the bookmark
    5. When you're viewing a session in Appium Inspector, click the bookmark to send data to AI Studio
  `;
};

/**
 * Create HTML for a draggable bookmarklet link
 */
export const createBookmarkletHtml = (): string => {
  const bookmarkletUrl = generateBookmarkletUrl();
  return `<a href="${bookmarkletUrl}" class="bookmarklet">Send to AI Studio</a>`;
};

/**
 * Process data received from bookmarklet
 * @param data URL encoded JSON data from Appium Inspector
 */
export const processBookmarkletData = (data: string): any => {
  try {
    return JSON.parse(decodeURIComponent(data));
  } catch (error) {
    console.error('Error processing bookmarklet data:', error);
    return null;
  }
};

export default {
  generateBookmarkletUrl,
  getBookmarkletInstructions,
  createBookmarkletHtml,
  processBookmarkletData,
};