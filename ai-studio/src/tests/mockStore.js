/**
 * Mock Redux Store for Testing
 */

import { createStore } from 'redux';
import { v4 as uuidv4 } from 'uuid';

// Mock reducer for testing
const initialState = {
  pages: [],
  projects: [],
  currentPageId: null,
  currentProjectId: null,
  analysis: {
    status: 'idle',
    progress: 0,
    result: null,
    error: null
  },
  codeGeneration: {
    status: 'idle',
    progress: 0,
    result: null,
    error: null
  },
  recentOperations: []
};

function mockReducer(state = initialState, action) {
  switch (action.type) {
    case 'ADD_PAGE':
      return {
        ...state,
        pages: [...state.pages, action.payload]
      };
      
    case 'UPDATE_PAGE':
      return {
        ...state,
        pages: state.pages.map(page => 
          page.id === action.payload.id ? { ...page, ...action.payload } : page
        )
      };
      
    case 'DELETE_PAGE':
      return {
        ...state,
        pages: state.pages.filter(page => page.id !== action.payload.id)
      };
      
    case 'SET_CURRENT_PAGE':
      return {
        ...state,
        currentPageId: action.payload
      };
      
    case 'ADD_PROJECT':
      return {
        ...state,
        projects: [...state.projects, action.payload]
      };
      
    case 'START_ANALYSIS':
      return {
        ...state,
        analysis: {
          ...state.analysis,
          status: action.payload.status,
          progress: 0,
          result: null,
          error: null
        }
      };
      
    case 'UPDATE_ANALYSIS_PROGRESS':
      return {
        ...state,
        analysis: {
          ...state.analysis,
          progress: action.payload.progress
        }
      };
      
    case 'COMPLETE_ANALYSIS':
      return {
        ...state,
        analysis: {
          ...state.analysis,
          status: 'completed',
          progress: 100,
          result: action.payload.result
        }
      };
      
    case 'ANALYSIS_FAILED':
      return {
        ...state,
        analysis: {
          ...state.analysis,
          status: 'failed',
          error: action.payload.error
        }
      };
      
    case 'START_CODE_GENERATION':
      return {
        ...state,
        codeGeneration: {
          ...state.codeGeneration,
          status: action.payload.status,
          progress: 0,
          result: null,
          error: null
        }
      };
      
    case 'UPDATE_CODE_GENERATION_PROGRESS':
      return {
        ...state,
        codeGeneration: {
          ...state.codeGeneration,
          progress: action.payload.progress
        }
      };
      
    case 'COMPLETE_CODE_GENERATION':
      return {
        ...state,
        codeGeneration: {
          ...state.codeGeneration,
          status: 'completed',
          progress: 100,
          result: action.payload.result
        }
      };
      
    case 'CODE_GENERATION_FAILED':
      return {
        ...state,
        codeGeneration: {
          ...state.codeGeneration,
          status: 'failed',
          error: action.payload.error
        }
      };
      
    case 'ADD_OPERATION':
      return {
        ...state,
        recentOperations: [
          {
            id: uuidv4(),
            timestamp: new Date().toISOString(),
            ...action.payload
          },
          ...state.recentOperations
        ]
      };
      
    default:
      return state;
  }
}

// Create mock store
const createMockStore = () => {
  return createStore(mockReducer, initialState);
};

export default createMockStore;