import { DOMParser } from 'xmldom';
import xpath from 'xpath';
import { createCanvas, loadImage } from 'canvas';

/**
 * Load app XML, screenshot, and session details for manual XPath testing.
 * @param {string} xmlString - The XML string representing the app's UI hierarchy.
 * @param {string} base64Screenshot - The base64-encoded screenshot string.
 * @param {string} sessionDetailsJson - The JSON string containing session details.
 */
async function loadAppResources(xmlString, base64Screenshot, sessionDetailsJson) {
  // Parse the XML string
  const xmlDoc = new DOMParser().parseFromString(xmlString);

  // Parse the session details JSON
  const sessionDetails = JSON.parse(sessionDetailsJson);
  console.log('Session Details:', sessionDetails);

  // Decode and display the screenshot
  const screenshotBuffer = Buffer.from(base64Screenshot, 'base64');
  const screenshot = await loadImage(screenshotBuffer);

  // Render the screenshot using canvas
  const canvas = createCanvas(screenshot.width, screenshot.height);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(screenshot, 0, 0);
  console.log('Screenshot loaded. Save or display it as needed.');

  // Return a function to evaluate XPath
  return (xpathExpression) => {
    const nodes = xpath.select(xpathExpression, xmlDoc);
    console.log(`XPath Results for "${xpathExpression}":`, nodes);
    return nodes;
  };
}

