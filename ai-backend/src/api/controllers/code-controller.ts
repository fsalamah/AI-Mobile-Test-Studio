import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { Logger } from '../../utils/logger.js';
import { CodeGenerationRequest } from '../../types/api.js';

export const codeController = {
  /**
   * Generate Page Object Model code
   */
  async generateCode(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const codeRequest = req.body as CodeGenerationRequest;
      
      // Validate request
      if (!codeRequest.page) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Page object is required',
            code: 'INVALID_REQUEST',
          },
        });
      }
      
      if (!codeRequest.elements || !Array.isArray(codeRequest.elements) || codeRequest.elements.length === 0) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Elements array is required and must not be empty',
            code: 'INVALID_REQUEST',
          },
        });
      }
      
      if (!codeRequest.language) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Language is required',
            code: 'INVALID_REQUEST',
          },
        });
      }
      
      // Check if language is supported
      const supportedLanguages = ['java', 'javascript', 'python', 'csharp', 'ruby'];
      if (!supportedLanguages.includes(codeRequest.language)) {
        return res.status(400).json({
          success: false,
          error: {
            message: `Language '${codeRequest.language}' is not supported. Supported languages: ${supportedLanguages.join(', ')}`,
            code: 'UNSUPPORTED_LANGUAGE',
          },
        });
      }
      
      // Check if framework is supported (if provided)
      if (codeRequest.framework) {
        const supportedFrameworks = {
          java: ['appium', 'selenium', 'junit4', 'junit5'],
          javascript: ['wdio', 'playwright', 'oxygen'],
          python: ['pytest', 'unittest'],
          csharp: ['nunit', 'mstest'],
          ruby: ['rspec', 'minitest'],
        };
        
        const frameworksForLanguage = supportedFrameworks[codeRequest.language as keyof typeof supportedFrameworks] || [];
        if (!frameworksForLanguage.includes(codeRequest.framework)) {
          return res.status(400).json({
            success: false,
            error: {
              message: `Framework '${codeRequest.framework}' is not supported for language '${codeRequest.language}'. Supported frameworks: ${frameworksForLanguage.join(', ')}`,
              code: 'UNSUPPORTED_FRAMEWORK',
            },
          });
        }
      }
      
      // Generate job ID
      const jobId = uuidv4();
      
      // In a real implementation, we would add this to a job queue
      // await JobQueue.addCodeJob(jobId, codeRequest);
      
      Logger.info(`Added code generation job ${jobId} to queue`);
      
      // Return job ID immediately
      res.status(202).json({
        success: true,
        data: {
          jobId,
          status: 'pending',
        },
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get supported languages and frameworks
   */
  async getSupportedLanguages(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Define supported languages and frameworks
      const supportedLanguages = [
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
      ];
      
      // Return supported languages and frameworks
      res.status(200).json({
        success: true,
        data: {
          languages: supportedLanguages,
        },
      });
    } catch (error) {
      next(error);
    }
  },
};