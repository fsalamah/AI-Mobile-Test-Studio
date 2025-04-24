import { CONFIG } from "./config.js";
import { FileUtils } from "./fileUtils.js";
import { Logger } from "./logger.js";
import { AIService } from "./aiService.js";
import { PromptBuilder } from "./promptBuilder.js";

/**
 * Creates a Page Object Model class based on the page object and provided files
 * @param {Object} page - The page object containing AI analysis, states, etc.
 * @param {string} guideFilePath - Path to the guide text file
 * @param {string|null} pageBaseFilePath - Optional path to the PageBase class implementation file
 * @returns {Promise<string>} - The generated POM class code
 */
async function executePOMClassPipeline(page, guideFilePath = CONFIG.POM_GUIDE, pageBaseFilePath = CONFIG.POM_PAGEBASE_CLASS) {
  try {
    Logger.log(`Starting POM class generation pipeline for page "${page.name}"...`, "info");
    
    // Validate inputs
    if (!page || !page.aiAnalysis || !page.aiAnalysis.locators || !page.states || page.states.length === 0) {
      throw new Error("Invalid page object structure");
    }
    
    // Extract locators from AI analysis
    const locators = page.aiAnalysis.locators;
    await FileUtils.writeOutputToFile(locators, "pom_locators");
    
    // Read guide text content
    const guideTextContent = await FileUtils.readFile(guideFilePath);
    const guideTextBase64 = Buffer.from(guideTextContent).toString('base64');
    
    // Read PageBase class implementation if provided
    let pageBaseClass = "PageBase"; // Default base class name
    let pageBaseBase64 = null;
    let hasPageBase = false;
    
    if (pageBaseFilePath) {
      try {
        const pageBaseContent = await FileUtils.readFile(pageBaseFilePath);
        // Extract the actual class name from the file
        const classNameMatch = pageBaseContent.match(/\s+class\s+(\w+)/);
        if (classNameMatch && classNameMatch[1]) {
          pageBaseClass = classNameMatch[1];
        }
        pageBaseBase64 = Buffer.from(pageBaseContent).toString('base64');
        hasPageBase = true;
        Logger.log(`Using PageBase class: ${pageBaseClass} from file`, "info");
      } catch (pageBaseError) {
        Logger.warn(`Could not read PageBase file: ${pageBaseError.message}. Using default class name.`, "warn");
      }
    } else {
      Logger.log(`No PageBase file provided. Using default class name: ${pageBaseClass}`, "info");
    }
    
    // Prepare all screenshots and page sources from all states
    const screenshots = [];
    const platforms = new Set(); // To track available platforms
    
    // Process all states to collect screenshots
    for (let i = 0; i < page.states.length; i++) {
      const state = page.states[i];
      
      if (!state.versions) continue;
      
      // Process Android version if available
      if (state.versions.android && state.versions.android.screenShot) {
        platforms.add('android');
        screenshots.push({
          platform: 'android',
          screenShot: state.versions.android.screenShot,
          pageSource: state.versions.android.pageSource,
          stateId: state.id,
          stateTitle: state.title || `State ${i + 1}`,
          stateDescription: state.description || '',
          isDefault: state.isDefault || false
        });
      }
      
      // Process iOS version if available
      if (state.versions.ios && state.versions.ios.screenShot) {
        platforms.add('ios');
        screenshots.push({
          platform: 'ios',
          screenShot: state.versions.ios.screenShot,
          pageSource: state.versions.ios.pageSource,
          stateId: state.id,
          stateTitle: state.title || `State ${i + 1}`,
          stateDescription: state.description || '',
          isDefault: state.isDefault || false
        });
      }
    }
    
    if (screenshots.length === 0) {
      throw new Error("No valid screenshots found in any state");
    }
    
    Logger.log(`Found ${screenshots.length} screenshots across ${platforms.size} platforms`, "info");
    
    // Create a JSON representing the locators for the AI service
    const locatorsJson = locators.map(loc => ({
      devName: loc.devName,
      description: loc.description || '',
      platform: loc.platform || 'both',
      xpath: loc.xpath || {},
      value: loc.value || ''
    }));
    
    // Prepare page metadata for the AI
    const pageMetadata = {
      name: page.name || '',
      description: page.description || '',
      module: page.module || '',
      platforms: Array.from(platforms)
    };
    
    // Convert data to base64
    const locatorsJsonBase64 = Buffer.from(JSON.stringify(locatorsJson)).toString('base64');
    const pageMetadataBase64 = Buffer.from(JSON.stringify(pageMetadata)).toString('base64');
    
    // Include all screenshot info including the stateId, which platform, and any available description
    const screenshotsInfo = screenshots.map(s => ({
      platform: s.platform,
      stateId: s.stateId,
      stateTitle: s.stateTitle,
      stateDescription: s.stateDescription,
      isDefault: s.isDefault
    }));
    const screenshotsInfoBase64 = Buffer.from(JSON.stringify(screenshotsInfo)).toString('base64');
    
    // Use PromptBuilder to create the prompt
    const prompt = PromptBuilder.createPOMGenerationPrompt(
      pageBaseClass,
      hasPageBase,
      pageMetadataBase64,
      screenshotsInfoBase64,
      guideTextBase64,
      locatorsJsonBase64,
      pageBaseBase64,
      screenshots
    );
    
    Logger.log(`Sending POM generation request to AI service with ${screenshots.length} screenshots...`, "info");
    
    // Create an instance of AIService
    const aiService = new AIService();
    
    // Call the AI service to generate the POM class
    const response = await aiService.generatePOMClass(CONFIG.POM_MODEL.MODEL, prompt);
    
    // Extract the POM class code from the response
    const pomClassCode = response.choices[0].message.content;
    
    // Save the generated POM class to a file
    const className = page.name.replace(/\s+/g, '') + 'Page';
    await FileUtils.writeOutputToFile(pomClassCode, `${className}_POM_Class`);
    
    Logger.log(`POM class generation completed successfully for page "${page.name}"`, "info");
    
    return pomClassCode;
  } catch (error) {
    Logger.error("Error in POM class generation pipeline:", error);
    await FileUtils.writeOutputToFile({
      error: error.toString(),
      stack: error.stack,
      timestamp: new Date().toISOString()
    }, "pom_generation_error_log");
    throw error;
  }
}

export {
  executePOMClassPipeline
};