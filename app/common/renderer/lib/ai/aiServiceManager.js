/**
 * AIServiceManager.js
 * 
 * Singleton for managing AIService instances with proper project context
 * Ensures model configurations are correctly loaded per project
 * Falls back to config.js when no project ID is provided
 */

import { AIService } from './aiService.js';
import { Logger } from './logger.js';

/**
 * Singleton manager for AI Service instances
 * Maintains a single instance per project ID
 */
class AIServiceManager {
  constructor() {
    // Map to store AIService instances by project ID
    this.serviceInstances = new Map();
    
    // Default instance for non-project operations
    // This will use the config.js settings as fallback
    this.defaultService = new AIService();
    
    Logger.log("AIServiceManager initialized", "info");
  }
  
  /**
   * Get or create an AIService instance for a project
   * @param {string|null} projectId - Project identifier (optional)
   * @returns {AIService} - AIService instance for this project
   */
  getServiceForProject(projectId) {
    // If no project ID, return default service that uses config.js
    if (!projectId) {
      Logger.log("Using default AIService (no project ID provided) - falling back to config.js", "info");
      return this.defaultService;
    }
    
    // Check if we already have an instance for this project
    if (!this.serviceInstances.has(projectId)) {
      Logger.log(`Creating new AIService for project: ${projectId}`, "info");
      this.serviceInstances.set(projectId, new AIService(projectId));
    } else {
      Logger.log(`Using existing AIService for project: ${projectId}`, "debug");
    }
    
    return this.serviceInstances.get(projectId);
  }
  
  /**
   * Update project context for all services
   * @param {string} oldProjectId - Previous project ID
   * @param {string} newProjectId - New project ID
   */
  updateProjectContext(oldProjectId, newProjectId) {
    if (oldProjectId === newProjectId) return;
    
    if (this.serviceInstances.has(oldProjectId)) {
      const service = this.serviceInstances.get(oldProjectId);
      service.updateProjectContext(newProjectId);
      
      // Update the map
      this.serviceInstances.set(newProjectId, service);
      this.serviceInstances.delete(oldProjectId);
      
      Logger.log(`Updated AIService project context from ${oldProjectId} to ${newProjectId}`, "info");
    }
  }
  
  /**
   * Reset or clear service instances
   */
  resetServices() {
    this.serviceInstances.clear();
    this.defaultService = new AIService(); // Recreate with config.js fallback
    Logger.log("AIServiceManager reset - all service instances cleared", "info");
  }
}

// Create and export the singleton instance
export const aiServiceManager = new AIServiceManager();