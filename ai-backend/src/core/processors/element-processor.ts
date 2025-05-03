import { Logger } from '../../utils/logger.js';
import { Element } from '../../types/api.js';

/**
 * Processor for element operations
 */
export class ElementProcessor {
  /**
   * Remove elements with duplicate devNames
   * @param elements Array of elements
   * @returns Array with duplicates removed
   */
  static removeDuplicateDevNames(elements: Element[]): Element[] {
    const seen = new Set<string>();
    const duplicates = new Set<string>();
    const result: Element[] = [];
    
    // First pass: identify duplicates
    for (const element of elements) {
      if (seen.has(element.devName)) {
        duplicates.add(element.devName);
      } else {
        seen.add(element.devName);
      }
    }
    
    // Second pass: keep only first occurrence of each devName
    seen.clear();
    for (const element of elements) {
      if (duplicates.has(element.devName)) {
        if (!seen.has(element.devName)) {
          result.push(element);
          seen.add(element.devName);
          Logger.warn(`Duplicate devName found: "${element.devName}", keeping first occurrence`);
        }
      } else {
        result.push(element);
      }
    }
    
    if (duplicates.size > 0) {
      Logger.warn(`Removed ${elements.length - result.length} elements with duplicate devNames`);
    }
    
    return result;
  }

  /**
   * Parse and log AI choices results
   * @param choices Array of AI response choices
   * @param label Optional label for logging
   * @returns Array of parsed results
   */
  static async parseAndLogResults(choices: any[], label: string = ''): Promise<any[]> {
    const results = [];
    
    for (let i = 0; i < choices.length; i++) {
      try {
        const content = choices[i].message.content;
        const parsed = typeof content === 'string' ? JSON.parse(content) : content;
        
        Logger.debug(`${label} Choice ${i}: ${parsed.length} elements`);
        
        results.push(parsed);
      } catch (error) {
        Logger.error(`Error parsing choice ${i}:`, error);
        throw error;
      }
    }
    
    return results;
  }

  /**
   * Group elements by state ID and platform
   * @param elements Array of elements
   * @returns Object with elements grouped by state ID and platform
   */
  static groupElementsByStateAndPlatform(elements: Element[]): Record<string, any> {
    const groups: Record<string, any> = {};
    
    for (const element of elements) {
      // Skip elements without state IDs or platform
      if (!element.stateId || !element.platform) {
        continue;
      }
      
      const key = `${element.stateId}_${element.platform}`;
      
      if (!groups[key]) {
        groups[key] = {
          stateId: element.stateId,
          platform: element.platform,
          elements: [],
        };
      }
      
      groups[key].elements.push({ ...element });
    }
    
    return groups;
  }

  /**
   * Extract common attributes from elements
   * @param elements Array of elements
   * @returns Object with attribute statistics
   */
  static analyzeElementAttributes(elements: Element[]): Record<string, any> {
    const stats: Record<string, any> = {
      count: elements.length,
      devNamePattern: {},
      platforms: {},
      stateIds: {},
    };
    
    // Extract patterns and counts
    for (const element of elements) {
      // Count platforms
      if (element.platform) {
        stats.platforms[element.platform] = (stats.platforms[element.platform] || 0) + 1;
      }
      
      // Count state IDs
      if (element.stateId) {
        stats.stateIds[element.stateId] = (stats.stateIds[element.stateId] || 0) + 1;
      }
      
      // Analyze devName patterns
      const devNameParts = element.devName.split(/(?=[A-Z])|_/);
      if (devNameParts.length > 1) {
        const prefix = devNameParts[0].toLowerCase();
        stats.devNamePattern[prefix] = (stats.devNamePattern[prefix] || 0) + 1;
      }
    }
    
    return stats;
  }
}