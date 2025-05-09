/**
 * AI Model Manager
 * 
 * Manages AI model configurations at two levels:
 * 1. Global level for predefined providers and models
 * 2. Project level for pipeline-specific model assignments
 * 
 * This allows users to define models once and then assign them to specific pipelines.
 */

// Storage key prefixes
const GLOBAL_MODELS_KEY = 'appium_ai_studio_global_models';
const PROJECT_MODEL_ASSIGNMENTS_KEY = 'appium_ai_studio_project_model_assignments_';

// Pipeline types 
export const PIPELINE_TYPES = {
  VISUAL_ANALYSIS: 'visual_analysis',
  XPATH_GENERATION: 'xpath_generation',
  XPATH_REPAIR: 'xpath_repair',
  POM_GENERATION: 'pom_generation',
  TRANSITION_ANALYSIS: 'transition_analysis',
  PAGE_DISAMBIGUATION: 'page_disambiguation'
};

// Default model configurations (global)
const DEFAULT_MODELS = {
  'openai': {
    name: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    apiKey: '',
    defaultModel: 'gpt-4',
    availableModels: ['gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo'],
    active: true
  },
  'google': {
    name: 'Google Gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai/',
    apiKey: '',
    defaultModel: 'gemini-2.5-flash-preview-04-17',
    availableModels: ['gemini-2.0-flash', 'gemini-2.5-flash-preview-04-17'],
    active: false
  },
  'anthropic': {
    name: 'Anthropic',
    baseUrl: 'https://api.anthropic.com/v1',
    apiKey: '',
    defaultModel: 'claude-3-opus',
    availableModels: ['claude-2', 'claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku'],
    active: false
  },
  'ollama': {
    name: 'Ollama',
    baseUrl: 'http://localhost:11434/api',
    apiKey: '',
    defaultModel: 'llama3',
    availableModels: ['llama3', 'mixtral', 'mistral'],
    active: false
  },
  'custom': {
    name: 'Custom Provider',
    baseUrl: '',
    apiKey: '',
    defaultModel: '',
    availableModels: [],
    active: false
  }
};

// Default model assignments for pipelines
const DEFAULT_MODEL_ASSIGNMENTS = {
  [PIPELINE_TYPES.VISUAL_ANALYSIS]: {
    providerId: 'openai',
    modelName: 'gpt-4'
  },
  [PIPELINE_TYPES.XPATH_GENERATION]: {
    providerId: 'openai',
    modelName: 'gpt-4'
  },
  [PIPELINE_TYPES.XPATH_REPAIR]: {
    providerId: 'openai',
    modelName: 'gpt-4'
  },
  [PIPELINE_TYPES.POM_GENERATION]: {
    providerId: 'openai',
    modelName: 'gpt-4'
  },
  // For this pipeline, we'll use CONFIG.MODEL directly in the AIService and modelConfigProvider
  [PIPELINE_TYPES.TRANSITION_ANALYSIS]: {
    providerId: 'auto',
    modelName: null  // This will trigger fallback to CONFIG.MODEL
  },
  // Page disambiguation pipeline uses the same model as transition analysis
  [PIPELINE_TYPES.PAGE_DISAMBIGUATION]: {
    providerId: 'auto',
    modelName: null  // This will trigger fallback to CONFIG.MODEL
  }
};

/**
 * Load global model configurations (provider definitions)
 * @returns {Object} - The global model configurations
 */
export const loadGlobalModelConfigs = () => {
  try {
    console.log(`[MODEL CONFIG] Loading global model configurations...`);
    const storedConfig = localStorage.getItem(GLOBAL_MODELS_KEY);
    
    if (storedConfig) {
      console.log(`[MODEL CONFIG] Found stored global configurations (${storedConfig.length} bytes)`);
      
      // Merge with defaults to ensure structure is maintained if new fields were added
      const parsedConfig = JSON.parse(storedConfig);
      
      console.log(`[MODEL CONFIG] Parsed ${Object.keys(parsedConfig).length} stored providers: ${Object.keys(parsedConfig).join(', ')}`);
      
      // Create a merged configuration where we start with defaults and override with stored values
      const mergedConfig = {};
      
      // First add all stored providers
      Object.keys(parsedConfig).forEach(providerId => {
        // Start with default if available, or empty object
        mergedConfig[providerId] = {
          ...(DEFAULT_MODELS[providerId] || {
            name: parsedConfig[providerId].name || 'Unknown Provider',
            baseUrl: '',
            apiKey: '',
            defaultModel: '',
            availableModels: [],
            active: false
          }),
          // Override with stored values
          ...parsedConfig[providerId]
        };
        
        // Debug each provider's API key status
        const provider = mergedConfig[providerId];
        const hasKey = !!provider.apiKey;
        const validKey = hasKey && provider.apiKey !== "YOUR_API_KEY";
        console.log(`[MODEL CONFIG] Provider '${providerId}' (${provider.name}): active=${provider.active}, hasApiKey=${hasKey}, validKey=${validKey}, baseUrl=${provider.baseUrl?.substring(0, 20)}...`);
      });
      
      // Then add any default providers that weren't in stored config
      Object.keys(DEFAULT_MODELS).forEach(providerId => {
        if (!mergedConfig[providerId]) {
          mergedConfig[providerId] = {...DEFAULT_MODELS[providerId]};
          console.log(`[MODEL CONFIG] Added default provider '${providerId}' that wasn't in stored config`);
        }
      });
      
      return mergedConfig;
    }
    
    // Return default configurations if nothing stored
    console.log(`[MODEL CONFIG] No stored configurations found, using defaults: ${Object.keys(DEFAULT_MODELS).join(', ')}`);
    return {...DEFAULT_MODELS};
  } catch (error) {
    console.error('[MODEL CONFIG] Error loading global model configurations:', error);
    console.log(`[MODEL CONFIG] Falling back to default models: ${Object.keys(DEFAULT_MODELS).join(', ')}`);
    return {...DEFAULT_MODELS};
  }
};

/**
 * Save global model configurations
 * @param {Object} modelConfigs - The model configurations to save
 */
export const saveGlobalModelConfigs = (modelConfigs) => {
  try {
    localStorage.setItem(GLOBAL_MODELS_KEY, JSON.stringify(modelConfigs));
    console.log('Global model configurations saved');
  } catch (error) {
    console.error('Error saving global model configurations:', error);
  }
};

/**
 * Load model assignments for a specific project
 * @param {string} projectId - Unique project identifier
 * @returns {Object} - The model assignments for this project's pipelines
 */
export const loadProjectModelAssignments = (projectId) => {
  try {
    console.log(`[MODEL CONFIG] Loading model assignments for project: ${projectId || 'undefined'}`);
    
    if (!projectId) {
      console.log(`[MODEL CONFIG] No project ID provided, returning default assignments: ${Object.keys(DEFAULT_MODEL_ASSIGNMENTS).join(', ')}`);
      return {...DEFAULT_MODEL_ASSIGNMENTS};
    }
    
    const storageKey = `${PROJECT_MODEL_ASSIGNMENTS_KEY}${projectId}`;
    const storedAssignments = localStorage.getItem(storageKey);
    
    if (storedAssignments) {
      console.log(`[MODEL CONFIG] Found stored assignments for project ${projectId} (${storedAssignments.length} bytes)`);
      
      try {
        const parsedAssignments = JSON.parse(storedAssignments);
        console.log(`[MODEL CONFIG] Parsed ${Object.keys(parsedAssignments).length} pipeline assignments: ${Object.keys(parsedAssignments).join(', ')}`);
        
        // Create merged assignments with defaults for any missing pipeline types
        const mergedAssignments = {...DEFAULT_MODEL_ASSIGNMENTS};
        
        // Override with stored assignments
        Object.keys(parsedAssignments).forEach(pipelineType => {
          if (PIPELINE_TYPES[pipelineType] || Object.values(PIPELINE_TYPES).includes(pipelineType)) {
            mergedAssignments[pipelineType] = parsedAssignments[pipelineType];
            
            // Debug each pipeline assignment
            const assignment = parsedAssignments[pipelineType];
            console.log(`[MODEL CONFIG] Project ${projectId} pipeline '${pipelineType}': providerId=${assignment.providerId}, modelName=${assignment.modelName || 'default'}`);
            
            // Check if there are any direct API keys in the pipeline assignment
            // This is critical because custom providers may have embedded API keys
            if (assignment.apiKey) {
              const validKey = assignment.apiKey !== "YOUR_API_KEY";
              console.log(`[MODEL CONFIG] Pipeline '${pipelineType}' has direct apiKey: validKey=${validKey}`);
            }
          } else {
            console.log(`[MODEL CONFIG] Skipping unknown pipeline type: ${pipelineType}`);
          }
        });
        
        return mergedAssignments;
      } catch (parseError) {
        console.error(`[MODEL CONFIG] Error parsing project assignments JSON:`, parseError);
        console.log(`[MODEL CONFIG] Raw stored assignments: ${storedAssignments.substring(0, 100)}...`);
        throw parseError;
      }
    } else {
      console.log(`[MODEL CONFIG] No stored assignments found for project ${projectId}, using defaults`);
    }
    
    return {...DEFAULT_MODEL_ASSIGNMENTS};
  } catch (error) {
    console.error('[MODEL CONFIG] Error loading project model assignments:', error);
    console.log(`[MODEL CONFIG] Falling back to default assignments: ${Object.keys(DEFAULT_MODEL_ASSIGNMENTS).join(', ')}`);
    return {...DEFAULT_MODEL_ASSIGNMENTS};
  }
};

/**
 * Save model assignments for a specific project
 * @param {string} projectId - Unique project identifier
 * @param {Object} modelAssignments - The model assignments to save
 */
export const saveProjectModelAssignments = (projectId, modelAssignments) => {
  try {
    if (!projectId) {
      console.warn('No project ID provided for saving model assignments');
      return;
    }
    
    const storageKey = `${PROJECT_MODEL_ASSIGNMENTS_KEY}${projectId}`;
    localStorage.setItem(storageKey, JSON.stringify(modelAssignments));
    console.log(`Model assignments saved for project ${projectId}`);
  } catch (error) {
    console.error('Error saving project model assignments:', error);
  }
};

/**
 * Get model configuration for a specific pipeline in a project
 * @param {string} projectId - Unique project identifier
 * @param {string} pipelineType - Type of pipeline (use PIPELINE_TYPES constants)
 * @returns {Object} - The model configuration for this pipeline
 */
export const getModelConfigForPipeline = (projectId, pipelineType) => {
  // Set up verbose logging for debugging
  const logs = [];
  const log = (message) => {
    console.log(`[MODEL CONFIG] ${message}`);
    logs.push(message);
  };
  
  log(`Getting model config for project: ${projectId}, pipeline: ${pipelineType}`);
  
  // Load global model configurations (all available providers and their models)
  const globalConfigs = loadGlobalModelConfigs();
  log(`Loaded ${Object.keys(globalConfigs).length} global providers`);
  
  // Log available providers
  Object.keys(globalConfigs).forEach(providerId => {
    const provider = globalConfigs[providerId];
    log(`Provider: ${providerId} (${provider.name}), active: ${provider.active}, baseUrl: ${provider.baseUrl.substring(0, 30)}...`);
  });
  
  // Load project-specific model assignments
  const modelAssignments = loadProjectModelAssignments(projectId);
  log(`Loaded project model assignments for ${projectId}`);
  
  // Log all pipeline assignments
  Object.keys(modelAssignments).forEach(pipeline => {
    const assignment = modelAssignments[pipeline];
    log(`Pipeline ${pipeline} assigned to provider: ${assignment.providerId}, model: ${assignment.modelName || 'default'}`);
  });
  
  // Get the assignment for this pipeline type, or use default
  const pipelineAssignment = modelAssignments[pipelineType] || DEFAULT_MODEL_ASSIGNMENTS[pipelineType];
  log(`Using assignment for ${pipelineType}: provider=${pipelineAssignment.providerId}, model=${pipelineAssignment.modelName || 'default'}`);
  
  // Find the provider referenced in the assignment
  const providerId = pipelineAssignment.providerId;
  const provider = globalConfigs[providerId];
  
  if (!provider) {
    log(`⚠️ Provider ${providerId} not found in global configs, falling back to default`);
    // Provider not found, use default
    const defaultConfig = {
      providerId: 'openai',
      modelName: 'gpt-4',
      ...globalConfigs['openai']
    };
    
    log(`Final config (DEFAULT): providerId=${defaultConfig.providerId}, modelName=${defaultConfig.modelName}, apiKey=${defaultConfig.apiKey ? (defaultConfig.apiKey.substring(0, 3) + '...') : 'none'}`);
    return defaultConfig;
  }
  
  // Return combined provider and model info
  const finalConfig = {
    providerId,
    modelName: pipelineAssignment.modelName || provider.defaultModel,
    ...provider
  };
  
  log(`Final config: providerId=${finalConfig.providerId}, modelName=${finalConfig.modelName}, apiKey=${finalConfig.apiKey ? (finalConfig.apiKey.substring(0, 3) + '...') : 'none'}`);
  
  // Store logs in the returned object for debugging
  finalConfig._logs = logs;
  
  return finalConfig;
};

/**
 * Set model assignment for a specific pipeline in a project
 * @param {string} projectId - Unique project identifier
 * @param {string} pipelineType - Type of pipeline (use PIPELINE_TYPES constants)
 * @param {string} providerId - Provider ID to use
 * @param {string} modelName - Model name to use
 */
export const assignModelToPipeline = (projectId, pipelineType, providerId, modelName) => {
  // Load current assignments
  const modelAssignments = loadProjectModelAssignments(projectId);
  
  // Update assignment for this pipeline
  modelAssignments[pipelineType] = {
    providerId,
    modelName
  };
  
  // Save updated assignments
  saveProjectModelAssignments(projectId, modelAssignments);
  
  return modelAssignments;
};

/**
 * Update a provider configuration (global setting)
 * @param {string} providerId - Provider ID to update
 * @param {Object} config - New configuration values
 */
export const updateProviderConfig = (providerId, config) => {
  const modelConfigs = loadGlobalModelConfigs();
  
  // Create provider if it doesn't exist
  if (!modelConfigs[providerId]) {
    modelConfigs[providerId] = {
      name: config.name || 'Custom Provider',
      baseUrl: '',
      apiKey: '',
      defaultModel: '',
      availableModels: [],
      active: false
    };
  }
  
  // Update provider with new values
  modelConfigs[providerId] = {
    ...modelConfigs[providerId],
    ...config
  };
  
  // Save updated configurations
  saveGlobalModelConfigs(modelConfigs);
  
  return modelConfigs;
};

/**
 * Set a provider as active (global setting)
 * @param {string} providerId - Provider ID to activate
 */
export const setActiveProvider = (providerId) => {
  const modelConfigs = loadGlobalModelConfigs();
  
  // Ensure provider exists
  if (!modelConfigs[providerId]) {
    console.error(`Provider ${providerId} not found`);
    return;
  }
  
  // Set all providers to inactive except the selected one
  Object.keys(modelConfigs).forEach(id => {
    modelConfigs[id].active = (id === providerId);
  });
  
  // Save updated configurations
  saveGlobalModelConfigs(modelConfigs);
  
  return modelConfigs;
};

/**
 * Add a new model to a provider (global setting)
 * @param {string} providerId - Provider ID to update
 * @param {string} modelName - Name of the model to add
 */
export const addModelToProvider = (providerId, modelName) => {
  const modelConfigs = loadGlobalModelConfigs();
  
  // Ensure provider exists
  if (!modelConfigs[providerId]) {
    console.error(`Provider ${providerId} not found`);
    return;
  }
  
  // Check if model already exists
  if (!modelConfigs[providerId].availableModels.includes(modelName)) {
    modelConfigs[providerId].availableModels.push(modelName);
    
    // Save updated configurations
    saveGlobalModelConfigs(modelConfigs);
  }
  
  return modelConfigs;
};

/**
 * Remove a provider configuration (global setting)
 * @param {string} providerId - Provider ID to remove
 */
export const removeProviderConfig = (providerId) => {
  // Don't allow removing built-in providers
  if (['openai', 'anthropic', 'ollama', 'custom'].includes(providerId)) {
    console.warn(`Cannot remove built-in provider ${providerId}`);
    return;
  }
  
  const modelConfigs = loadGlobalModelConfigs();
  
  // Remove the provider
  if (modelConfigs[providerId]) {
    delete modelConfigs[providerId];
    
    // Save updated configurations
    saveGlobalModelConfigs(modelConfigs);
  }
  
  return modelConfigs;
};

/**
 * Get all available model providers
 * This is a convenience function for the UI
 * @returns {Object} The available model providers
 */
export const getAllProviders = () => {
  return loadGlobalModelConfigs();
};

/**
 * For backward compatibility - get active model configuration for a project
 * @param {string} projectId - Unique project identifier
 * @returns {Object} - The default model configuration
 */
export const getActiveModelConfig = (projectId) => {
  // This function is maintained for backward compatibility
  // It returns the model config for the VISUAL_ANALYSIS pipeline
  return getModelConfigForPipeline(projectId, PIPELINE_TYPES.VISUAL_ANALYSIS);
};