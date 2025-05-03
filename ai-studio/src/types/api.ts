// Common API response structure
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code: string;
    details?: any;
  };
}

// Job response
export interface JobResponse {
  jobId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress?: number;
  result?: any;
  error?: string;
  createdAt?: string;
  startedAt?: string;
  completedAt?: string;
}

// Page object
export interface Page {
  id: string;
  name: string;
  description?: string;
  states: PageState[];
  createdAt?: string;
  updatedAt?: string;
  projectId?: string;
}

// Page state (represents a specific state/view of the page)
export interface PageState {
  id: string;
  title?: string;
  description?: string;
  versions: {
    [platform: string]: {
      screenShot: string; // Base64 encoded
      pageSource: string; // XML
    };
  };
}

// Element properties
export interface Element {
  devName: string;
  name?: string;
  description?: string;
  value?: string;
  platform?: string;
  stateId?: string;
}

// Element with locator
export interface ElementWithLocator extends Element {
  xpath?: {
    expression: string;
    success: boolean;
    numberOfMatches: number;
    error?: string;
  };
  alternativeXpaths?: string[];
}

// Analysis request
export interface VisualAnalysisRequest {
  page: Page;
  osVersions?: string[];
}

// XPath generation request
export interface XPathGenerationRequest {
  elements: Element[];
  platforms?: string[];
}

// XPath repair request
export interface XPathRepairRequest {
  elements: ElementWithLocator[];
  page: Page;
}

// Code generation request
export interface CodeGenerationRequest {
  page: Page;
  elements?: ElementWithLocator[];
  language: string;
  framework?: string;
}

// Language and framework information
export interface Language {
  id: string;
  name: string;
  frameworks: Framework[];
}

export interface Framework {
  id: string;
  name: string;
}

// Project
export interface Project {
  id: string;
  name: string;
  description?: string;
  pages: string[]; // Page IDs
  createdAt?: string;
  updatedAt?: string;
}