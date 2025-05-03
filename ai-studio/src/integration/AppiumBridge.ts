/**
 * Appium Inspector Bridge
 * This module provides functionality to communicate with Appium Inspector
 */

import fileUtils from '../utils/fileUtils';
import importExportUtils from '../utils/importExportUtils';
import { Page } from '../types/api';

// Define the structure of a session object
interface AppiumSession {
  sessionId: string;
  sessionInfo: {
    platformName: string;
    platformVersion: string;
    deviceName: string;
    [key: string]: any;
  };
  source: string;
  screenshot: string;
  [key: string]: any;
}

// Define the bridge class
class AppiumBridge {
  private static instance: AppiumBridge;
  private localStorageKey = 'aistudio-appium-session';

  // Private constructor for singleton
  private constructor() {}

  // Get singleton instance
  public static getInstance(): AppiumBridge {
    if (!AppiumBridge.instance) {
      AppiumBridge.instance = new AppiumBridge();
    }
    return AppiumBridge.instance;
  }

  /**
   * Check if we're running within Appium Inspector
   */
  public isRunningInAppium(): boolean {
    // Look for a specific global variable or URL pattern
    return (
      window.location.href.includes('appium-inspector') ||
      (window as any).__APPIUM_INSPECTOR__ !== undefined
    );
  }

  /**
   * Get data from Appium Inspector's current session
   */
  public async getAppiumSessionData(): Promise<AppiumSession | null> {
    try {
      // If running in Appium Inspector, try to access its Redux store
      if (this.isRunningInAppium()) {
        // This would need to be adjusted based on how Appium Inspector exposes its state
        const appiumState = (window as any).__APPIUM_INSPECTOR_STATE__;
        
        if (appiumState) {
          return {
            sessionId: appiumState.session.sessionId,
            sessionInfo: appiumState.session.capabilities,
            source: appiumState.inspector.source,
            screenshot: appiumState.inspector.screenshot,
          };
        }
      }
      
      // If not running in Appium or can't access state, try localStorage
      const savedSession = localStorage.getItem(this.localStorageKey);
      if (savedSession) {
        return JSON.parse(savedSession) as AppiumSession;
      }
      
      return null;
    } catch (error) {
      console.error('Error getting Appium session data:', error);
      return null;
    }
  }

  /**
   * Save session data from Appium Inspector to localStorage
   */
  public saveAppiumSessionData(session: AppiumSession): boolean {
    try {
      localStorage.setItem(this.localStorageKey, JSON.stringify(session));
      return true;
    } catch (error) {
      console.error('Error saving Appium session data:', error);
      return false;
    }
  }

  /**
   * Create a page from Appium session data
   */
  public createPageFromAppiumSession(session: AppiumSession): Page {
    const platform = session.sessionInfo.platformName?.toLowerCase() || 'unknown';
    
    return {
      id: session.sessionId || crypto.randomUUID(),
      name: session.sessionInfo.deviceName || 'Appium Page',
      description: `Created from Appium Inspector (${session.sessionInfo.platformName} ${session.sessionInfo.platformVersion})`,
      states: [
        {
          id: crypto.randomUUID(),
          title: 'Main State',
          description: 'Imported from Appium Inspector',
          versions: {
            [platform]: {
              screenShot: session.screenshot,
              pageSource: session.source,
            },
          },
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Export session data from Appium Inspector as a file
   */
  public exportAppiumSessionAsFile(session: AppiumSession, filename?: string): void {
    const jsonData = JSON.stringify(session, null, 2);
    const defaultFilename = `appium-session-${new Date().toISOString().split('T')[0]}.appiumsession`;
    
    fileUtils.downloadFile(
      jsonData,
      filename || defaultFilename,
      'application/json'
    );
  }

  /**
   * Handle data transfer from Appium Inspector
   */
  public handleDataFromAppium(data: any): Page | null {
    try {
      // Check if this is valid session data
      if (data.source && data.screenshot && data.sessionInfo) {
        return this.createPageFromAppiumSession(data);
      }
      return null;
    } catch (error) {
      console.error('Error handling data from Appium:', error);
      return null;
    }
  }
}

// Export singleton instance
export default AppiumBridge.getInstance();