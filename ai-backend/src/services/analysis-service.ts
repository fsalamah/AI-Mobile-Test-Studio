import { Logger } from '../utils/logger.js';
import { FileUtils } from '../core/utils/file-utils.js';
import { executeVisualPipeline } from '../core/pipelines/visual-pipeline.js';
import { executeXpathPipeline } from '../core/pipelines/xpath-pipeline.js';
import { executeXpathFixPipeline } from '../core/pipelines/xpath-fix-pipeline.js';
import { Page, Element, ElementWithLocator } from '../types/api.js';

// Initialize services
const fileUtils = new FileUtils();

/**
 * Service for analyzing pages and elements
 */
export class AnalysisService {
  /**
   * Analyze visual elements in a page
   * @param page Page object with states
   * @param osVersions OS versions to analyze
   * @param jobId Optional job ID for tracking
   * @returns Elements with their properties
   */
  async analyzeVisualElements(
    page: Page,
    osVersions: string[],
    jobId: string
  ): Promise<Element[]> {
    try {
      Logger.info(`Starting visual analysis for job ${jobId}`);
      
      // Store input data for reference
      await fileUtils.writeFile(page, `${jobId}_input.json`, 'analysis');
      
      // Execute visual pipeline
      const elements = await executeVisualPipeline(page, osVersions, jobId);
      
      // Store result for reference
      await fileUtils.writeFile(elements, `${jobId}_result.json`, 'analysis');
      
      return elements;
    } catch (error) {
      Logger.error(`Error in visual analysis for job ${jobId}:`, error);
      throw error;
    }
  }

  /**
   * Generate XPath locators for elements
   * @param elements Elements to generate XPaths for
   * @param platforms Platforms to generate XPaths for
   * @param jobId Optional job ID for tracking
   * @returns Elements with XPath locators
   */
  async generateLocators(
    elements: Element[],
    platforms: string[],
    jobId: string
  ): Promise<ElementWithLocator[]> {
    try {
      Logger.info(`Starting XPath generation for job ${jobId}`);
      
      // Store input data for reference
      await fileUtils.writeFile(elements, `${jobId}_input.json`, 'locators');
      
      // Execute XPath pipeline
      const elementsWithXPaths = await executeXpathPipeline(elements, platforms, jobId);
      
      // Store result for reference
      await fileUtils.writeFile(elementsWithXPaths, `${jobId}_result.json`, 'locators');
      
      return elementsWithXPaths;
    } catch (error) {
      Logger.error(`Error in XPath generation for job ${jobId}:`, error);
      throw error;
    }
  }

  /**
   * Repair failing XPath locators
   * @param elementsWithXPaths Elements with XPaths
   * @param page Page object
   * @param jobId Optional job ID for tracking
   * @returns Elements with repaired XPaths
   */
  async repairLocators(
    elementsWithXPaths: ElementWithLocator[],
    page: Page,
    jobId: string
  ): Promise<ElementWithLocator[]> {
    try {
      Logger.info(`Starting XPath repair for job ${jobId}`);
      
      // Store input data for reference
      await fileUtils.writeFile(
        { elements: elementsWithXPaths, page }, 
        `${jobId}_input.json`, 
        'locator-repair'
      );
      
      // Execute XPath fix pipeline
      const repairedElements = await executeXpathFixPipeline(elementsWithXPaths, page, jobId);
      
      // Store result for reference
      await fileUtils.writeFile(repairedElements, `${jobId}_result.json`, 'locator-repair');
      
      return repairedElements;
    } catch (error) {
      Logger.error(`Error in XPath repair for job ${jobId}:`, error);
      throw error;
    }
  }

  /**
   * Get repair statistics for elements
   * @param elementsWithXPaths Elements with XPaths
   * @returns Repair statistics
   */
  getRepairStatistics(elementsWithXPaths: ElementWithLocator[]): Record<string, any> {
    // Count valid and invalid XPaths
    const totalXPaths = elementsWithXPaths.length;
    const validXPaths = elementsWithXPaths.filter(
      e => e.xpath && e.xpath.success && e.xpath.numberOfMatches === 1
    ).length;
    const invalidXPaths = totalXPaths - validXPaths;
    
    // Count elements with alternative XPaths
    const withAlternatives = elementsWithXPaths.filter(
      e => e.alternativeXpaths && e.alternativeXpaths.length > 0
    ).length;
    
    // Group by platform
    const platformStats: Record<string, any> = {};
    
    elementsWithXPaths.forEach(element => {
      const platform = element.platform || 'unknown';
      
      if (!platformStats[platform]) {
        platformStats[platform] = {
          total: 0,
          valid: 0,
          invalid: 0,
        };
      }
      
      platformStats[platform].total++;
      
      if (element.xpath && element.xpath.success && element.xpath.numberOfMatches === 1) {
        platformStats[platform].valid++;
      } else {
        platformStats[platform].invalid++;
      }
    });
    
    // Calculate success rates
    for (const platform in platformStats) {
      platformStats[platform].successRate = platformStats[platform].valid / platformStats[platform].total;
    }
    
    return {
      totalXPaths,
      validXPaths,
      invalidXPaths,
      validPercent: totalXPaths > 0 ? (validXPaths / totalXPaths) * 100 : 0,
      withAlternatives,
      platformStats,
    };
  }
}