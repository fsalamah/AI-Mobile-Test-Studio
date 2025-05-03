import { Logger } from '../utils/logger.js';
import { FileUtils } from '../core/utils/file-utils.js';
import { executePOMPipeline } from '../core/pipelines/pom-pipeline.js';
import { Page } from '../types/api.js';

// Initialize services
const fileUtils = new FileUtils();

/**
 * Service for code generation
 */
export class CodeService {
  /**
   * Generate Page Object Model code
   * @param page Page object with elements and locators
   * @param language Target programming language
   * @param framework Target testing framework
   * @param jobId Optional job ID for tracking
   * @returns Generated POM code
   */
  async generatePOM(
    page: Page,
    language: string,
    framework: string,
    jobId: string
  ): Promise<string> {
    try {
      Logger.info(`Starting POM generation for job ${jobId}`);
      
      // Store input data for reference
      await fileUtils.writeFile(
        { page, language, framework }, 
        `${jobId}_input.json`, 
        'code'
      );
      
      // Execute POM pipeline
      const pomCode = await executePOMPipeline(page, language, framework, jobId);
      
      // Store result for reference
      await fileUtils.writeFile(
        { language, framework, code: pomCode }, 
        `${jobId}_result.json`, 
        'code'
      );
      
      return pomCode;
    } catch (error) {
      Logger.error(`Error in POM generation for job ${jobId}:`, error);
      throw error;
    }
  }

  /**
   * Get supported languages and frameworks
   * @returns Object with supported languages and frameworks
   */
  getSupportedLanguages(): Record<string, any> {
    return {
      languages: [
        {
          id: 'java',
          name: 'Java',
          frameworks: [
            { id: 'appium', name: 'Appium' },
            { id: 'selenium', name: 'Selenium' },
            { id: 'junit4', name: 'JUnit 4' },
            { id: 'junit5', name: 'JUnit 5' },
          ],
        },
        {
          id: 'javascript',
          name: 'JavaScript',
          frameworks: [
            { id: 'wdio', name: 'WebdriverIO' },
            { id: 'playwright', name: 'Playwright' },
            { id: 'oxygen', name: 'Oxygen' },
          ],
        },
        {
          id: 'python',
          name: 'Python',
          frameworks: [
            { id: 'pytest', name: 'PyTest' },
            { id: 'unittest', name: 'unittest' },
          ],
        },
        {
          id: 'csharp',
          name: 'C#',
          frameworks: [
            { id: 'nunit', name: 'NUnit' },
            { id: 'mstest', name: 'MSTest' },
          ],
        },
        {
          id: 'ruby',
          name: 'Ruby',
          frameworks: [
            { id: 'rspec', name: 'RSpec' },
            { id: 'minitest', name: 'Minitest' },
          ],
        },
      ],
    };
  }

  /**
   * Validate language and framework compatibility
   * @param language Target programming language
   * @param framework Target testing framework
   * @returns Validation result
   */
  validateLanguageFramework(language: string, framework: string): { valid: boolean; message?: string } {
    const supportedLanguages = this.getSupportedLanguages();
    
    // Check if language is supported
    const languageInfo = supportedLanguages.languages.find(
      (l: any) => l.id === language
    );
    
    if (!languageInfo) {
      return { 
        valid: false, 
        message: `Unsupported language: ${language}` 
      };
    }
    
    // Check if framework is supported for this language
    if (framework) {
      const frameworkInfo = languageInfo.frameworks.find(
        (f: any) => f.id === framework
      );
      
      if (!frameworkInfo) {
        return { 
          valid: false, 
          message: `Unsupported framework ${framework} for language ${language}` 
        };
      }
    }
    
    return { valid: true };
  }
}