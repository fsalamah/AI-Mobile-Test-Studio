import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import { Page, Project } from '../types/api';

interface AppState {
  // Projects
  projects: Project[];
  currentProjectId: string | null;
  addProject: (project: Omit<Project, 'id'>) => string;
  updateProject: (projectId: string, updates: Partial<Project>) => void;
  deleteProject: (projectId: string) => void;
  setCurrentProject: (projectId: string | null) => void;
  
  // Pages
  pages: Page[];
  currentPageId: string | null;
  addPage: (page: Omit<Page, 'id'>) => string;
  updatePage: (pageId: string, updates: Partial<Page>) => void;
  deletePage: (pageId: string) => void;
  setCurrentPage: (pageId: string | null) => void;
  
  // UI State
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  darkMode: boolean;
  setDarkMode: (darkMode: boolean) => void;
  
  // Recent Operations
  recentOperations: {
    id: string;
    type: 'visual-analysis' | 'xpath-generation' | 'xpath-repair' | 'code-generation';
    pageId: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    timestamp: string;
  }[];
  addOperation: (operation: Omit<AppState['recentOperations'][0], 'id' | 'timestamp'>) => string;
  updateOperation: (operationId: string, updates: Partial<Omit<AppState['recentOperations'][0], 'id'>>) => void;
  clearOperations: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // Projects
      projects: [],
      currentProjectId: null,
      addProject: (project) => {
        const id = uuidv4();
        set((state) => ({
          projects: [...state.projects, { ...project, id, createdAt: new Date().toISOString() }],
        }));
        return id;
      },
      updateProject: (projectId, updates) => {
        set((state) => ({
          projects: state.projects.map((project) =>
            project.id === projectId
              ? { ...project, ...updates, updatedAt: new Date().toISOString() }
              : project
          ),
        }));
      },
      deleteProject: (projectId) => {
        set((state) => ({
          projects: state.projects.filter((project) => project.id !== projectId),
          currentProjectId: state.currentProjectId === projectId ? null : state.currentProjectId,
        }));
      },
      setCurrentProject: (projectId) => {
        set({ currentProjectId: projectId });
      },
      
      // Pages
      pages: [],
      currentPageId: null,
      addPage: (page) => {
        const id = uuidv4();
        set((state) => ({
          pages: [...state.pages, { ...page, id, createdAt: new Date().toISOString() }],
        }));
        return id;
      },
      updatePage: (pageId, updates) => {
        set((state) => ({
          pages: state.pages.map((page) =>
            page.id === pageId
              ? { ...page, ...updates, updatedAt: new Date().toISOString() }
              : page
          ),
        }));
      },
      deletePage: (pageId) => {
        set((state) => ({
          pages: state.pages.filter((page) => page.id !== pageId),
          currentPageId: state.currentPageId === pageId ? null : state.currentPageId,
        }));
      },
      setCurrentPage: (pageId) => {
        set({ currentPageId: pageId });
      },
      
      // UI State
      sidebarCollapsed: false,
      setSidebarCollapsed: (collapsed) => {
        set({ sidebarCollapsed: collapsed });
      },
      darkMode: false,
      setDarkMode: (darkMode) => {
        set({ darkMode });
      },
      
      // Recent Operations
      recentOperations: [],
      addOperation: (operation) => {
        const id = uuidv4();
        const timestamp = new Date().toISOString();
        set((state) => ({
          recentOperations: [
            { ...operation, id, timestamp },
            ...state.recentOperations.slice(0, 19), // Keep only 20 most recent
          ],
        }));
        return id;
      },
      updateOperation: (operationId, updates) => {
        set((state) => ({
          recentOperations: state.recentOperations.map((op) =>
            op.id === operationId ? { ...op, ...updates } : op
          ),
        }));
      },
      clearOperations: () => {
        set({ recentOperations: [] });
      },
    }),
    {
      name: 'ai-studio-storage',
    }
  )
);

export default useAppStore;