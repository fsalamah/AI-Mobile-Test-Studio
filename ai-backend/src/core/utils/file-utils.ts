import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { CONFIG } from '../../config/index.js';
import { Logger } from '../../utils/logger.js';

/**
 * Utilities for file operations
 */
export class FileUtils {
  /**
   * Base directory for file operations
   */
  private baseDir: string;

  /**
   * Constructor
   * @param baseDir Base directory for file operations
   */
  constructor(baseDir: string = CONFIG.storage.baseDir) {
    this.baseDir = baseDir;
  }

  /**
   * Ensure a directory exists
   * @param directory Directory path
   */
  async ensureDirectoryExists(directory: string): Promise<void> {
    try {
      await fs.access(directory);
    } catch {
      await fs.mkdir(directory, { recursive: true });
    }
  }

  /**
   * Write content to a file
   * @param data Data to write
   * @param filename Optional filename (if not provided, a UUID will be generated)
   * @param subdirectory Optional subdirectory to write to
   * @returns Object with filename and full path
   */
  async writeFile(
    data: any,
    filename?: string,
    subdirectory?: string
  ): Promise<{ filename: string; filePath: string }> {
    const dir = subdirectory ? path.join(this.baseDir, subdirectory) : this.baseDir;
    await this.ensureDirectoryExists(dir);

    const actualFilename = filename || `${uuidv4()}.json`;
    const filePath = path.join(dir, actualFilename);

    let content: string;
    if (typeof data === 'object') {
      content = JSON.stringify(data, null, 2);
    } else if (typeof data === 'string') {
      content = data;
    } else {
      content = String(data);
    }

    await fs.writeFile(filePath, content, 'utf8');

    return { filename: actualFilename, filePath };
  }

  /**
   * Write output to a file with timestamp
   * @param data Data to write
   * @param filePrefix Prefix for the filename
   * @param subdirectory Optional subdirectory to write to
   * @returns Object with filename and full path
   */
  async writeOutputToFile(
    data: any,
    filePrefix: string,
    subdirectory: string = 'output'
  ): Promise<{ filename: string; filePath: string }> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${filePrefix}_${timestamp}.json`;
    return this.writeFile(data, filename, subdirectory);
  }

  /**
   * Read a file
   * @param filename Filename to read
   * @param subdirectory Optional subdirectory to read from
   * @returns File content as string
   */
  async readFile(filename: string, subdirectory?: string): Promise<string> {
    const dir = subdirectory ? path.join(this.baseDir, subdirectory) : this.baseDir;
    const filePath = path.join(dir, filename);

    return fs.readFile(filePath, 'utf8');
  }

  /**
   * Read a JSON file
   * @param filename Filename to read
   * @param subdirectory Optional subdirectory to read from
   * @returns Parsed JSON content
   */
  async readJsonFile(filename: string, subdirectory?: string): Promise<any> {
    const content = await this.readFile(filename, subdirectory);
    return JSON.parse(content);
  }

  /**
   * List files in a directory
   * @param subdirectory Optional subdirectory to list
   * @param filter Optional filter function
   * @returns Array of filenames
   */
  async listFiles(subdirectory?: string, filter?: (filename: string) => boolean): Promise<string[]> {
    const dir = subdirectory ? path.join(this.baseDir, subdirectory) : this.baseDir;
    await this.ensureDirectoryExists(dir);

    const files = await fs.readdir(dir);
    return filter ? files.filter(filter) : files;
  }

  /**
   * Delete a file
   * @param filename Filename to delete
   * @param subdirectory Optional subdirectory
   */
  async deleteFile(filename: string, subdirectory?: string): Promise<void> {
    const dir = subdirectory ? path.join(this.baseDir, subdirectory) : this.baseDir;
    const filePath = path.join(dir, filename);

    try {
      await fs.unlink(filePath);
    } catch (error: any) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }
  }

  /**
   * Create a temporary directory
   * @param prefix Prefix for the directory name
   * @returns Path to the temporary directory
   */
  async createTempDirectory(prefix: string = 'temp-'): Promise<string> {
    const tempDir = path.join(this.baseDir, 'temp');
    await this.ensureDirectoryExists(tempDir);

    const dirName = `${prefix}${uuidv4()}`;
    const dirPath = path.join(tempDir, dirName);
    await this.ensureDirectoryExists(dirPath);

    return dirPath;
  }

  /**
   * Clean up temporary directories older than specified age
   * @param maxAge Maximum age in milliseconds (default: 24 hours)
   * @returns Number of directories removed
   */
  async cleanupTempDirectories(maxAge: number = 24 * 60 * 60 * 1000): Promise<number> {
    const tempDir = path.join(this.baseDir, 'temp');
    try {
      await this.ensureDirectoryExists(tempDir);
      
      const now = Date.now();
      const dirs = await fs.readdir(tempDir);
      
      let removed = 0;
      for (const dir of dirs) {
        const dirPath = path.join(tempDir, dir);
        const stats = await fs.stat(dirPath);
        
        if (now - stats.mtimeMs > maxAge) {
          try {
            await fs.rm(dirPath, { recursive: true, force: true });
            removed++;
          } catch (error) {
            Logger.error(`Failed to remove temp directory ${dirPath}:`, error);
          }
        }
      }
      
      return removed;
    } catch (error) {
      Logger.error('Error cleaning up temp directories:', error);
      return 0;
    }
  }
}