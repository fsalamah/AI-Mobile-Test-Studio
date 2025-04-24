import fs from "fs/promises";
import path from "path";

export class FileUtils {
  static getTimestamp() {
    const now = new Date();
    return now.toISOString().replace(/:/g, '-').replace(/\./g, '_');
  }

  static async writeOutputToFile(data, label) {
    const timestamp = this.getTimestamp();
    const fileName = `${label}_${timestamp}.json`;
    try {
      await fs.writeFile("output/"+fileName, JSON.stringify(data, null, 2), 'utf8');
      console.log(`Written ${label} to ${fileName}`);
      return fileName;
    } catch (err) {
      console.error(`Error writing ${label} to file:`, err);
      throw err;
    }
  }

  static async readJsonFile(filePath) {
    try {
      const data = await fs.readFile(path.resolve(filePath), "utf8");
      return JSON.parse(data);
    } catch (err) {
      console.error("Error reading JSON file:", err);
      throw err;
    }
  }

  static async readFile(filePath) {
    try {
      const data = await fs.readFile(path.resolve(filePath), "utf8");
      return data;
    } catch (err) {
      console.error("Error reading file:", err);
      throw err;
    }
  }
}
