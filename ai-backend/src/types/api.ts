// Error types
export interface ApiError extends Error {
  statusCode: number;
  code: string;
  details?: any;
}

// Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code: string;
    details?: any;
    stack?: string;
  };
}

// Job types
export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface JobResponse {
  jobId: string;
  status: JobStatus;
  progress?: number;
  result?: any;
  error?: {
    message: string;
    code: string;
    details?: any;
  };
}

// Request types
export interface AnalysisRequest {
  page: Page;
  osVersions?: string[];
}

export interface LocatorRequest {
  elements: Element[];
  pageSource: string;
  platform: string;
}

export interface RepairRequest {
  elements: ElementWithLocator[];
  pageSource: string;
  platform: string;
}

export interface CodeGenerationRequest {
  page: Page;
  elements: ElementWithLocator[];
  language: string;
  framework?: string;
}

// Data types
export interface Page {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt?: string;
  states: State[];
  metadata?: Record<string, any>;
}

export interface State {
  id: string;
  title: string;
  description?: string;
  versions: Record<string, StateVersion>;
}

export interface StateVersion {
  screenShot: string; // base64
  pageSource: string; // XML
  deviceInfo?: DeviceInfo;
}

export interface DeviceInfo {
  platform: string;
  platformVersion: string;
  deviceName: string;
  udid?: string;
}

export interface Element {
  id?: string;
  devName: string;
  name: string;
  description: string;
  value: string;
  isDynamicValue?: boolean;
  stateId: string;
  platform?: string;
}

export interface ElementWithLocator extends Element {
  xpath: XPathInfo;
  alternativeXpaths?: XPathInfo[];
}

export interface XPathInfo {
  xpathExpression: string;
  numberOfMatches?: number;
  matchingNodes?: string[];
  isValid?: boolean;
  success?: boolean;
}