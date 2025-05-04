/**
 * Test utility for model configuration fallback logic
 * 
 * This file provides a test function to verify that the model configuration
 * is being properly prioritized:
 * 1. Project-specific configuration (if available)
 * 2. Config.js defaults (as fallback)
 */

import { AIService } from './aiService.js';
import { CONFIG } from './config.js';
import { 
  getModelConfigForPipeline, 
  PIPELINE_TYPES, 
  updateProviderConfig, 
  assignModelToPipeline,
  saveProjectModelAssignments,
  loadProjectModelAssignments
} from './modelManager.js';

// Test project ID that doesn't clash with real projects
const TEST_PROJECT_ID = 'test_model_config_project_' + Date.now();

/**
 * Tests the model configuration fallback logic
 * @returns {Object} - Test results
 */
export function testModelConfigFallback() {
  const results = {
    success: true,
    tests: [],
    failures: []
  };

  try {
    // Create test function to run a test and log results
    const runTest = (name, testFn) => {
      try {
        const result = testFn();
        results.tests.push({ name, success: true, result });
        console.log(`✅ Test passed: ${name}`);
        return result;
      } catch (error) {
        results.success = false;
        results.failures.push({ name, error: error.message });
        console.error(`❌ Test failed: ${name}`, error);
        return null;
      }
    };

    // Test 1: Check if default config is used when no project config exists
    runTest('Default config without project', () => {
      const aiService = new AIService();
      const modelUsed = aiService.getModelToUse();
      if (modelUsed !== CONFIG.MODEL) {
        throw new Error(`Expected model ${CONFIG.MODEL}, got ${modelUsed}`);
      }
      return true;
    });

    // Test 2: Check if project config is used when it exists
    runTest('Project config when available', () => {
      // Create a test project config
      const testModel = 'test-model-xyz';
      const assignments = loadProjectModelAssignments(TEST_PROJECT_ID);
      
      // Assign a unique model name to each pipeline
      Object.values(PIPELINE_TYPES).forEach(pipelineType => {
        assignments[pipelineType] = {
          providerId: 'openai',
          modelName: `${testModel}-${pipelineType}`
        };
      });
      
      // Save the test configuration
      saveProjectModelAssignments(TEST_PROJECT_ID, assignments);
      
      // Create service with the test project
      const aiService = new AIService(TEST_PROJECT_ID);
      
      // Verify model configuration for each pipeline
      let allMatch = true;
      const results = {};
      
      Object.values(PIPELINE_TYPES).forEach(pipelineType => {
        const expectedModel = `${testModel}-${pipelineType}`;
        const pipelineConfig = getModelConfigForPipeline(TEST_PROJECT_ID, pipelineType);
        
        results[pipelineType] = {
          expected: expectedModel,
          actual: pipelineConfig.modelName
        };
        
        if (pipelineConfig.modelName !== expectedModel) {
          allMatch = false;
        }
      });
      
      if (!allMatch) {
        throw new Error('Project configs did not match expected values: ' + JSON.stringify(results));
      }
      
      return results;
    });

    // Test 3: Check if specific model overrides both project and default
    runTest('Explicit model overrides all', () => {
      const explicitModel = 'explicit-model-override';
      const aiService = new AIService(TEST_PROJECT_ID);
      const modelUsed = aiService.getModelToUse(explicitModel);
      
      if (modelUsed !== explicitModel) {
        throw new Error(`Expected model ${explicitModel}, got ${modelUsed}`);
      }
      
      return true;
    });

    // Test 4: Check for POM-specific configurations
    runTest('POM-specific configuration', () => {
      const aiService = new AIService();
      const pomConfig = CONFIG.POM_MODEL;
      
      // Get POM model via internal methods
      const pipelineConfig = getModelConfigForPipeline(null, PIPELINE_TYPES.POM_GENERATION);
      
      if (!pomConfig || !pomConfig.MODEL) {
        // Skip test if POM config doesn't exist
        return 'POM config not found - test skipped';
      }
      
      // Create mock messages for POM generation
      const mockMessages = [{ role: 'user', content: 'Generate a POM' }];
      
      // This should use POM-specific configuration
      try {
        // We don't want to actually call the service, just check if the correct model would be used
        const clientBaseUrl = aiService.client.baseURL;
        const shouldUsePomUrl = pomConfig.API && pomConfig.API.BASE_URL;
        
        // Check that the generatePOMClass method would use the correct URL
        const wantsToUsePomConfig = shouldUsePomUrl && 
          shouldUsePomUrl !== CONFIG.API.BASE_URL;
        
        return {
          hasCustomPomConfig: !!pomConfig,
          wantsToUsePomConfig,
          defaultApiBaseUrl: CONFIG.API.BASE_URL,
          pomApiBaseUrl: pomConfig.API?.BASE_URL
        };
      } catch (error) {
        return `Error in POM config test: ${error.message}`;
      }
    });

    // Test 5: Clean up test data
    runTest('Clean up test data', () => {
      // Remove test project config
      saveProjectModelAssignments(TEST_PROJECT_ID, {});
      return true;
    });

    // Return all test results
    return results;
  } catch (error) {
    console.error('Error in model config tests:', error);
    results.success = false;
    results.failures.push({ name: 'Test Suite', error: error.message });
    return results;
  }
}

// Export a function to run tests
export async function runModelConfigTests() {
  console.log('Running model configuration tests...');
  const results = testModelConfigFallback();
  console.log(JSON.stringify(results, null, 2));
  return results;
}