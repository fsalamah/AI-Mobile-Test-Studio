import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { Logger } from '../../utils/logger.js';
import { Page } from '../../types/api.js';

// Note: This is a placeholder implementation. In a real application,
// this would interact with a database or file system.
const projects: any[] = [];

export const projectController = {
  /**
   * Get all projects
   */
  async getAllProjects(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Return projects without pages to keep response smaller
      const projectsWithoutPages = projects.map(({ pages, ...project }) => project);
      
      res.status(200).json({
        success: true,
        data: {
          projects: projectsWithoutPages,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get project by ID
   */
  async getProjectById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { projectId } = req.params;
      
      // Find project by ID
      const project = projects.find((p) => p.id === projectId);
      
      if (!project) {
        return res.status(404).json({
          success: false,
          error: {
            message: `Project with ID ${projectId} not found`,
            code: 'PROJECT_NOT_FOUND',
          },
        });
      }
      
      res.status(200).json({
        success: true,
        data: {
          project,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Create a new project
   */
  async createProject(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { name, description } = req.body;
      
      // Validate request
      if (!name) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Project name is required',
            code: 'INVALID_REQUEST',
          },
        });
      }
      
      // Create new project
      const newProject = {
        id: uuidv4(),
        name,
        description: description || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        pages: [],
      };
      
      // Add project to array
      projects.push(newProject);
      
      Logger.info(`Created new project: ${newProject.id} - ${name}`);
      
      // Return created project without pages
      const { pages, ...projectWithoutPages } = newProject;
      
      res.status(201).json({
        success: true,
        data: {
          project: projectWithoutPages,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Add a page to a project
   */
  async addPageToProject(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { projectId } = req.params;
      const page = req.body as Page;
      
      // Find project by ID
      const projectIndex = projects.findIndex((p) => p.id === projectId);
      
      if (projectIndex === -1) {
        return res.status(404).json({
          success: false,
          error: {
            message: `Project with ID ${projectId} not found`,
            code: 'PROJECT_NOT_FOUND',
          },
        });
      }
      
      // Validate page
      if (!page.name || !page.states || !Array.isArray(page.states) || page.states.length === 0) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Invalid page data',
            code: 'INVALID_REQUEST',
            details: 'Page must have a name and at least one state',
          },
        });
      }
      
      // Ensure page has an ID
      if (!page.id) {
        page.id = uuidv4();
      }
      
      // Ensure page has timestamps
      if (!page.createdAt) {
        page.createdAt = new Date().toISOString();
      }
      
      page.updatedAt = new Date().toISOString();
      
      // Add page to project
      projects[projectIndex].pages.push(page);
      
      // Update project's updatedAt timestamp
      projects[projectIndex].updatedAt = new Date().toISOString();
      
      Logger.info(`Added page ${page.id} to project ${projectId}`);
      
      res.status(201).json({
        success: true,
        data: {
          page,
        },
      });
    } catch (error) {
      next(error);
    }
  },
};