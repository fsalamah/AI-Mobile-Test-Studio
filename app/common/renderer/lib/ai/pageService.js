import { FileUtils } from './fileUtils.js';

export class PageService {
  static async getPageById(filePath, pageId) {
    try {
      const json = await FileUtils.readJsonFile(filePath);
      return json.pages.find((p) => p.id === pageId);
    } catch (err) {
      console.error("Error extracting page:", err);
      throw err;
    }
  }
  static async getPageStateById(filePath, pageId,stateId) {
    try {
      const json = await FileUtils.readJsonFile(filePath);
      return json.pages.find((p) => p.id === pageId).states.find((s) => s.id === stateId);
    } catch (err) {
      console.error("Error extracting page state:", err);
      throw err;
    }
  }
  static async getPageOsStateDetails(filePath, pageId,stateId,os) {
    try {
      const json = await FileUtils.readJsonFile(filePath);
      return json.pages.find((p) => p.id === pageId).states.find((s) => s.id === stateId).versions[os];
    } catch (err) {
      console.error("Error extracting page state:", err);
      throw err;
    }
  }

}
