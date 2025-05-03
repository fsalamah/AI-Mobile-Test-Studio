import { message } from 'antd';
import fileUtils from './fileUtils';
import { Page, Project } from '../types/api';

// Define the structure of an export file
interface ExportData {
  version: string;
  timestamp: string;
  type: 'project' | 'page' | 'project-collection' | 'page-collection';
  data: Project | Page | Project[] | Page[];
}

/**
 * Export a project to a file
 * @param project The project to export
 */
export const exportProject = async (project: Project) => {
  try {
    const exportData: ExportData = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      type: 'project',
      data: project,
    };

    const jsonData = JSON.stringify(exportData, null, 2);
    fileUtils.downloadFile(
      jsonData,
      `project-${project.name.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-${project.id}.json`,
      'application/json'
    );

    message.success(`Project "${project.name}" exported successfully`);
    return true;
  } catch (error) {
    console.error('Error exporting project:', error);
    message.error('Failed to export project');
    return false;
  }
};

/**
 * Export a page to a file
 * @param page The page to export
 */
export const exportPage = async (page: Page) => {
  try {
    const exportData: ExportData = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      type: 'page',
      data: page,
    };

    const jsonData = JSON.stringify(exportData, null, 2);
    fileUtils.downloadFile(
      jsonData,
      `page-${page.name.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-${page.id}.json`,
      'application/json'
    );

    message.success(`Page "${page.name}" exported successfully`);
    return true;
  } catch (error) {
    console.error('Error exporting page:', error);
    message.error('Failed to export page');
    return false;
  }
};

/**
 * Export multiple projects to a file
 * @param projects The projects to export
 */
export const exportProjects = async (projects: Project[]) => {
  try {
    const exportData: ExportData = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      type: 'project-collection',
      data: projects,
    };

    const jsonData = JSON.stringify(exportData, null, 2);
    fileUtils.downloadFile(
      jsonData,
      `projects-${new Date().toISOString().split('T')[0]}.json`,
      'application/json'
    );

    message.success(`${projects.length} projects exported successfully`);
    return true;
  } catch (error) {
    console.error('Error exporting projects:', error);
    message.error('Failed to export projects');
    return false;
  }
};

/**
 * Export multiple pages to a file
 * @param pages The pages to export
 */
export const exportPages = async (pages: Page[]) => {
  try {
    const exportData: ExportData = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      type: 'page-collection',
      data: pages,
    };

    const jsonData = JSON.stringify(exportData, null, 2);
    fileUtils.downloadFile(
      jsonData,
      `pages-${new Date().toISOString().split('T')[0]}.json`,
      'application/json'
    );

    message.success(`${pages.length} pages exported successfully`);
    return true;
  } catch (error) {
    console.error('Error exporting pages:', error);
    message.error('Failed to export pages');
    return false;
  }
};

/**
 * Import data from a file
 * @param file The file to import
 * @returns The imported data
 */
export const importFromFile = async (file: File): Promise<ExportData | null> => {
  try {
    const content = await fileUtils.readFileAsText(file);
    const data = JSON.parse(content) as ExportData;

    // Validate the imported data
    if (!data.version || !data.type || !data.data) {
      throw new Error('Invalid file format');
    }

    message.success('File imported successfully');
    return data;
  } catch (error) {
    console.error('Error importing file:', error);
    message.error('Failed to import file');
    return null;
  }
};

/**
 * Convert Appium Inspector session to AI Studio page
 * @param file The Appium Inspector session file
 * @returns The converted page
 */
export const convertAppiumSessionToPage = async (file: File): Promise<Page | null> => {
  try {
    // Read file content
    const content = await fileUtils.readFileAsText(file);
    const sessionData = JSON.parse(content);

    // Check if this is a valid Appium Inspector session file
    if (!sessionData.sessionInfo || !sessionData.source || !sessionData.screenshot) {
      throw new Error('Invalid Appium Inspector session file');
    }

    // Extract platform info
    const platform = sessionData.sessionInfo.platformName?.toLowerCase() || 'unknown';

    // Create a new page object
    const page: Page = {
      id: sessionData.sessionId || crypto.randomUUID(),
      name: sessionData.sessionInfo.deviceName || 'Imported Page',
      description: `Imported from Appium Inspector session (${sessionData.sessionInfo.platformName} ${sessionData.sessionInfo.platformVersion})`,
      states: [
        {
          id: crypto.randomUUID(),
          title: 'Main State',
          description: 'Imported from Appium Inspector',
          versions: {
            [platform]: {
              screenShot: sessionData.screenshot,
              pageSource: sessionData.source,
            },
          },
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    message.success('Appium Inspector session imported successfully');
    return page;
  } catch (error) {
    console.error('Error converting Appium session:', error);
    message.error('Failed to import Appium Inspector session');
    return null;
  }
};

/**
 * Create a new Page from a screenshot and XML source
 * @param screenshot The screenshot data URL
 * @param source The XML source
 * @param name The page name
 * @param platform The platform (ios or android)
 * @returns The new page
 */
export const createPageFromFiles = (
  screenshot: string,
  source: string,
  name: string,
  platform: 'ios' | 'android'
): Page => {
  return {
    id: crypto.randomUUID(),
    name,
    description: `Created from uploaded files`,
    states: [
      {
        id: crypto.randomUUID(),
        title: 'Main State',
        description: 'Imported from files',
        versions: {
          [platform]: {
            screenShot: screenshot,
            pageSource: source,
          },
        },
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
};

export default {
  exportProject,
  exportPage,
  exportProjects,
  exportPages,
  importFromFile,
  convertAppiumSessionToPage,
  createPageFromFiles,
};