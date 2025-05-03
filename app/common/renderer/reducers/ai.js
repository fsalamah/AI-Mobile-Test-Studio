// File: store/reducers/ai.js
import { executeVisualPipeline, executeXpathPipeline } from "../lib/ai/pipeline.js";
import { executeXpathFixPipeline } from "../lib/ai/xpathFixPipeline.js";
import { Logger as PipelineLogger } from "../lib/ai/logger.js";

// ===== ACTION TYPES =====
export const AI_VISUAL_ANALYSIS_START = 'AI_VISUAL_ANALYSIS_START';
export const AI_XPATH_ANALYSIS_START = 'AI_XPATH_ANALYSIS_START';
export const AI_XPATH_FIX_START = 'AI_XPATH_FIX_START';
export const AI_ANALYSIS_SUCCESS = 'AI_ANALYSIS_SUCCESS';
export const AI_ANALYSIS_FAILURE = 'AI_ANALYSIS_FAILURE';
export const UPDATE_AI_PROGRESS = 'UPDATE_AI_PROGRESS';
export const CLEAR_ANALYSIS_RESULTS = 'CLEAR_ANALYSIS_RESULTS';
export const CLEAR_ANALYSIS_HISTORY = 'CLEAR_ANALYSIS_HISTORY';
export const UPDATE_AI_SETTINGS = 'UPDATE_AI_SETTINGS';

// ===== INITIAL STATE =====
const initialState = {
  isAnalyzing: false,
  analysisType: null, // 'visual' or 'xpath' or 'xpath-fix'
  results: null,
  history: [],
  error: null,
  status: 'idle', // 'idle', 'loading', 'success', 'failed'
  progressMessage: '',
  progressPercent: 0,
  settings: {
    autoAnalyze: true,
    saveHistory: true,
    maxHistoryItems: 20,
    preferredModel: 'default'
  }
};

// ===== REDUCER =====
export default function aiReducer(state = initialState, action) {
  switch (action.type) {
    case AI_VISUAL_ANALYSIS_START:
      return {
        ...state,
        isAnalyzing: true,
        analysisType: 'visual',
        results: null,
        error: null,
        status: 'loading',
        progressMessage: 'Starting visual analysis...',
        progressPercent: 0
      };
      
    case AI_XPATH_ANALYSIS_START:
      return {
        ...state,
        isAnalyzing: true,
        analysisType: 'xpath',
        error: null,
        status: 'loading',
        progressMessage: 'Starting XPath analysis...',
        progressPercent: 0
      };
      
    case AI_XPATH_FIX_START:
      return {
        ...state,
        isAnalyzing: true,
        analysisType: 'xpath-fix',
        error: null,
        status: 'loading',
        progressMessage: 'Starting XPath fix process...',
        progressPercent: 0
      };
      
    case AI_ANALYSIS_SUCCESS:
      // Only add to history if enabled and we have results
      const updatedHistory = state.settings.saveHistory
        ? [
            {
              type: state.analysisType,
              timestamp: Date.now(),
              result: action.payload
            },
            ...state.history
          ].slice(0, state.settings.maxHistoryItems)
        : state.history;
        
      return {
        ...state,
        isAnalyzing: false,
        results: action.payload,
        history: updatedHistory,
        status: 'success',
        progressMessage: '',
        progressPercent: 100
      };
      
    case AI_ANALYSIS_FAILURE:
      return {
        ...state,
        isAnalyzing: false,
        error: action.payload,
        status: 'failed',
        progressMessage: `Error: ${action.payload}`,
        progressPercent: 0
      };
      
    case UPDATE_AI_PROGRESS:
      return {
        ...state,
        progressMessage: action.payload.message,
        progressPercent: action.payload.progress || state.progressPercent
      };
      
    case CLEAR_ANALYSIS_RESULTS:
      return {
        ...state,
        results: null,
        status: 'idle',
        progressMessage: '',
        progressPercent: 0
      };
      
    case CLEAR_ANALYSIS_HISTORY:
      return {
        ...state,
        history: []
      };
      
    case UPDATE_AI_SETTINGS:
      return {
        ...state,
        settings: {
          ...state.settings,
          ...action.payload
        }
      };
      
    default:
      return state;
  }
}

// ===== ACTION CREATORS =====

// Start Visual Analysis Action
export function startVisualAnalysis(page, platforms) {
  return async (dispatch) => {
    // First dispatch the start action
    dispatch({
      type: AI_VISUAL_ANALYSIS_START,
      payload: { page, platforms }
    });
    
    try {
      // Create a logger to track progress
      const logger = new PipelineLogger();
      
      // Connect logger to Redux updates
      logger.onProgress((progress, message) => {
        dispatch(updateAiProgress(message, progress));
      });
      
      // Execute the visual pipeline
      const result = await executeVisualPipeline(page, platforms);
      
      // Dispatch success with the results
      dispatch({
        type: AI_ANALYSIS_SUCCESS,
        payload: result
      });
      
      return result;
    } catch (error) {
      // Dispatch failure with the error message
      dispatch({
        type: AI_ANALYSIS_FAILURE,
        payload: error.message || 'Unknown error during visual analysis'
      });
      
      return null;
    }
  };
}

// Start XPath Analysis Action
export function startXpathAnalysis(visualElements, platforms) {
  return async (dispatch) => {
    // First dispatch the start action
    dispatch({
      type: AI_XPATH_ANALYSIS_START,
      payload: { visualElements, platforms }
    });
    
    try {
      // Create a logger to track progress
      const logger = new PipelineLogger();
      
      // Connect logger to Redux updates
      logger.onProgress((progress, message) => {
        dispatch(updateAiProgress(message, progress));
      });
      
      // Execute the XPath pipeline
      const result = await executeXpathPipeline(visualElements, platforms);
      
      // Dispatch success with the results
      dispatch({
        type: AI_ANALYSIS_SUCCESS,
        payload: result
      });
      
      return result;
    } catch (error) {
      // Dispatch failure with the error message
      dispatch({
        type: AI_ANALYSIS_FAILURE,
        payload: error.message || 'Unknown error during XPath analysis'
      });
      
      return null;
    }
  };
}

// Start XPath Fix Process
export function startXpathFixProcess(elementsWithXPaths, page) {
    return async (dispatch) => {
      dispatch({
        type: AI_XPATH_FIX_START,
        payload: { elementsWithXPaths, page }
      });
      
      try {
        console.log("Starting XPath fix process with:", 
          { elementCount: elementsWithXPaths.length, pageId: page.id });
        
        // Add the pipeline call in a try/catch to see specific errors
        const result = await executeXpathFixPipeline(elementsWithXPaths, page);
        
        console.log("XPath fix process completed:", 
          { resultCount: result.length });
          
        dispatch({
          type: AI_ANALYSIS_SUCCESS,
          payload: result
        });
        
        return result;
      } catch (error) {
        console.error("Detailed XPath fix error:", error);
        dispatch({
          type: AI_ANALYSIS_FAILURE,
          payload: error.message || 'Unknown error during XPath fix process'
        });
        
        return null;
      }
    };
  }

// Update AI Progress
export function updateAiProgress(message, progress) {
  return {
    type: UPDATE_AI_PROGRESS,
    payload: { message, progress }
  };
}

// Clear Analysis Results
export function clearAnalysisResults() {
  return {
    type: CLEAR_ANALYSIS_RESULTS
  };
}

// Clear Analysis History
export function clearAnalysisHistory() {
  return {
    type: CLEAR_ANALYSIS_HISTORY
  };
}

// Update AI Settings
export function updateAiSettings(settings) {
  return {
    type: UPDATE_AI_SETTINGS,
    payload: settings
  };
}